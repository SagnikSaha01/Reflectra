const supabase = require('../db/database');
const openai = require('./openaiClient');
const vectorStore = require('./vectorStore');

const REFLECTION_SYSTEM_PROMPT = `You are a thoughtful digital wellness coach helping users reflect on their browsing behavior.

Your role is to:
1. Analyze browsing session data to answer user questions
2. Provide insights without judgment - focus on awareness, not productivity pressure
3. Help users understand patterns in their digital behavior
4. Encourage healthy reflection and self-awareness
5. Highlight interesting findings or patterns

Keep responses conversational, insightful, and focused on well-being rather than productivity metrics.`;

async function generateReflection(query, timeRange = 'today') {
  const timeRangeStart = getStartTimeForRange(timeRange);
  const sessionData = await getSessionDataForTimeRange(timeRange);
  const relevantSessions = await vectorStore.querySimilarSessions(query, {
    topK: 8,
    startTime: timeRangeStart
  });

  const context = buildContextFromSessions(sessionData, relevantSessions);

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
      context: {
        timeframeSessions: sessionData,
        relevantSessions
      },
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error generating reflection:', error);
    throw new Error('Failed to generate reflection');
  }
}

function getStartTimeForRange(timeRange) {
  const now = Date.now();

  switch (timeRange) {
    case 'today':
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      return todayStart.getTime();
    case 'week':
      return now - (7 * 24 * 60 * 60 * 1000);
    case 'month':
      return now - (30 * 24 * 60 * 60 * 1000);
    default:
      return now - (24 * 60 * 60 * 1000);
  }
}

async function getSessionDataForTimeRange(timeRange) {
  const startTime = getStartTimeForRange(timeRange);

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

function buildContextFromSessions(sessions, relevantSessions = []) {
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

  if (relevantSessions.length > 0) {
    context += '\nRelevant sessions for user query:\n';
    relevantSessions.forEach((session, index) => {
      const time = session.timestamp ? new Date(session.timestamp).toISOString() : 'Unknown time';
      const minutes = Math.round((session.duration || 0) / 60000);
      context += `- ${index + 1}. ${session.title || session.url} (${minutes}m, ${time})\n  ${session.url}\n`;
    });
  }

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
