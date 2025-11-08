const OpenAI = require('openai');
const supabase = require('../db/database');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const CATEGORY_SYSTEM_PROMPT = `You are an AI assistant that categorizes web browsing activity for digital wellness insights.

Given a URL and page title, classify the browsing session into ONE of these categories:

1. **Focused Work** - Deep work, coding, writing, professional productivity tools
2. **Learning** - Educational content, tutorials, courses, documentation, skill development
3. **Research** - Information gathering, reading articles, news, exploration
4. **Social Connection** - Social media, messaging platforms, community engagement
5. **Relaxation** - Entertainment, videos, music, games, leisure browsing
6. **Mindless Scroll** - Unfocused browsing, excessive social media, clickbait
7. **Communication** - Email, chat, professional communication tools
8. **Uncategorized** - Unable to determine or neutral activity

Respond with ONLY the category name, nothing else.

Consider context clues:
- Time spent patterns (inferred from session data)
- URL domain reputation
- Page title keywords
- User intent signals`;

async function categorizeSession(url, title) {
  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: CATEGORY_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `URL: ${url}\nTitle: ${title || 'No title'}`
        }
      ],
      temperature: 0.3,
      max_tokens: 50
    });

    const categoryName = response.choices[0].message.content.trim();

    // Get category ID from database
    const { data: category, error } = await supabase
      .from('categories')
      .select('id')
      .eq('name', categoryName)
      .single();

    if (error) {
      console.error('Error fetching category:', error.message);
      return null;
    }

    return category ? category.id : null;
  } catch (error) {
    console.error('Error categorizing session:', error.message);
    // Return Uncategorized category as fallback
    const { data: uncategorized } = await supabase
      .from('categories')
      .select('id')
      .eq('name', 'Uncategorized')
      .single();

    return uncategorized ? uncategorized.id : null;
  }
}

async function categorizeUncategorizedSessions() {
  const { data: uncategorizedSessions, error } = await supabase
    .from('sessions')
    .select('id, url, title')
    .is('category_id', null)
    .order('timestamp', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching uncategorized sessions:', error.message);
    return { error: error.message, categorized: 0 };
  }

  if (uncategorizedSessions.length === 0) {
    return { message: 'No uncategorized sessions found', categorized: 0 };
  }

  console.log(`Categorizing ${uncategorizedSessions.length} sessions...`);

  let categorized = 0;

  for (const session of uncategorizedSessions) {
    const categoryId = await categorizeSession(session.url, session.title);

    if (categoryId) {
      const { error: updateError } = await supabase
        .from('sessions')
        .update({ category_id: categoryId })
        .eq('id', session.id);

      if (!updateError) {
        categorized++;
      }
    }

    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`Categorized ${categorized} sessions`);

  return {
    message: 'Categorization complete',
    categorized,
    total: uncategorizedSessions.length
  };
}

async function batchCategorize(sessions) {
  // For future optimization: batch multiple sessions in one API call
  const results = [];

  for (const session of sessions) {
    const categoryId = await categorizeSession(session.url, session.title);
    results.push({ sessionId: session.id, categoryId });
  }

  return results;
}

module.exports = {
  categorizeSession,
  categorizeUncategorizedSessions,
  batchCategorize
};
