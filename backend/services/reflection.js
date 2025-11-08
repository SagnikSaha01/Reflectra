const OpenAI = require('openai');
const supabase = require('../db/database');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const REFLECTION_SYSTEM_PROMPT = `You are a thoughtful digital wellness coach helping users reflect on their browsing behavior.

Your role is to:
1. Analyze browsing session data to answer user questions
2. Provide insights without judgment - focus on awareness, not productivity pressure
3. Help users understand patterns in their digital behavior
4. Encourage healthy reflection and self-awareness
5. Highlight interesting findings or patterns

Keep responses conversational, insightful, and focused on well-being rather than productivity metrics.`;

async function generateReflection(query, timeRange = 'today', userId) {
  // Get relevant browsing data based on time range
  const sessionData = await getSessionDataForTimeRange(timeRange, userId);

  // Build context for the LLM
  const context = buildContextFromSessions(sessionData);

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: REFLECTION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Based on this browsing data:\n\n${context}\n\nUser question: ${query}`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return {
      answer: response.choices[0].message.content,
      context: sessionData,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error generating reflection:', error);
    throw new Error('Failed to generate reflection');
  }
}

async function getSessionDataForTimeRange(timeRange, userId) {
  let startTime;
  const now = Date.now();

  switch (timeRange) {
    case 'today':
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      startTime = todayStart.getTime();
      break;
    case 'week':
      startTime = now - (7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startTime = now - (30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startTime = now - (24 * 60 * 60 * 1000); // Last 24 hours
  }

  const { data: sessions, error } = await supabase
    .from('sessions')
    .select(`
      url,
      title,
      duration,
      timestamp,
      categories:category_id (
        name,
        wellness_type
      )
    `)
    .eq('user_id', userId)
    .gte('timestamp', startTime)
    .order('timestamp', { ascending: false })
    .limit(200);

  if (error) {
    console.error('Error fetching sessions:', error.message);
    return [];
  }

  // Flatten the nested category data
  return sessions.map(session => ({
    url: session.url,
    title: session.title,
    duration: session.duration,
    timestamp: session.timestamp,
    category: session.categories?.name || 'Uncategorized',
    wellness_type: session.categories?.wellness_type || 'unknown'
  }));
}

function buildContextFromSessions(sessions) {
  if (sessions.length === 0) {
    return 'No browsing activity found for this time period.';
  }

  // Aggregate by category
  const categoryStats = {};

  sessions.forEach(session => {
    const category = session.category || 'Uncategorized';

    if (!categoryStats[category]) {
      categoryStats[category] = {
        count: 0,
        totalTime: 0,
        sites: []
      };
    }

    categoryStats[category].count++;
    categoryStats[category].totalTime += session.duration;

    // Store top sites
    if (categoryStats[category].sites.length < 5) {
      categoryStats[category].sites.push({
        title: session.title,
        url: session.url,
        duration: session.duration
      });
    }
  });

  // Format context string
  let context = `Total sessions: ${sessions.length}\n\n`;
  context += 'Time by category:\n';

  Object.entries(categoryStats).forEach(([category, stats]) => {
    const minutes = Math.round(stats.totalTime / 60000);
    context += `- ${category}: ${minutes} minutes (${stats.count} sessions)\n`;

    // Add top sites for this category
    if (stats.sites.length > 0) {
      context += '  Top sites:\n';
      stats.sites.forEach(site => {
        const siteMins = Math.round(site.duration / 60000);
        context += `    • ${site.title || site.url} (${siteMins}m)\n`;
      });
    }
  });

  return context;
}

async function generateWeeklySummary() {
  const sessions = await getSessionDataForTimeRange('week');
  const context = buildContextFromSessions(sessions);

  const summaryPrompt = `Create a thoughtful weekly summary of this browsing activity. Focus on:
1. Overall patterns and trends
2. Digital wellness insights
3. Suggestions for balance (if applicable)
4. Positive observations

Keep it encouraging and insightful.

${context}`;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: REFLECTION_SYSTEM_PROMPT },
        { role: 'user', content: summaryPrompt }
      ],
      temperature: 0.7,
      max_tokens: 600
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error generating weekly summary:', error);
    throw new Error('Failed to generate weekly summary');
  }
}

module.exports = {
  generateReflection,
  generateWeeklySummary
};
