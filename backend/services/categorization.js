const OpenAI = require('openai');
const supabase = require('../db/database');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// URL Pattern-based categorization for instant classification
const URL_PATTERNS = {
   'Mindless Scroll': [
    /instagram\.com\/reels/i,
    /youtube\.com\/shorts/i,          
    /tiktok\.com/i,                  
    /facebook\.com\/(watch|reels)/i 
  ],
  'Focused Work': [
    /github\.com\/.*\/pull/i,
    /github\.com\/.*\/issues/i,
    /notion\.so/i,
    /linear\.app/i,
    /figma\.com/i,
    /canva\.com/i,
    /docs\.google\.com\/document/i,
    /docs\.google\.com\/spreadsheets/i,
    /overleaf\.com/i,
    /replit\.com/i,
    /codesandbox\.io/i,
    /stackblitz\.com/i,
    /vscode\.dev/i
  ],
  'Learning': [
    /coursera\.org/i,
    /udemy\.com/i,
    /edx\.org/i,
    /khanacademy\.org/i,
    /codecademy\.com/i,
    /freecodecamp\.org/i,
    /udacity\.com/i,
    /pluralsight\.com/i,
    /skillshare\.com/i,
    /leetcode\.com/i,
    /hackerrank\.com/i,
    /brilliant\.org/i,
    /duolingo\.com/i,
    /youtube\.com.*\/watch.*tutorial/i,
    /youtube\.com.*\/watch.*learn/i,
    /youtube\.com.*\/watch.*course/i,
    /linkedin\.com\/learning/i, // <-- ADDED
    /reddit\.com\/r\/learnprogramming/i, // <-- ADDED
    /reddit\.com\/r\/askscience/i, // <-- ADDED
    /reddit\.com\/r\/history/i // <-- ADDED
  ],
  'Research': [
    /stackoverflow\.com/i,
    /github\.com(?!.*\/(pull|issues))/i, // This pattern is great!
    /medium\.com/i,
    /dev\.to/i,
    /arxiv\.org/i,
    /scholar\.google\.com/i,
    /wikipedia\.org/i,
    /docs\./i,
    /documentation/i,
    /readthedocs\.io/i,
    /npmjs\.com/i,
    /pypi\.org/i,
    /mdn\.mozilla\.org/i,
    /w3schools\.com/i
  ],
  'Social Connection': [
    /facebook\.com/i,
    /instagram\.com/i,
    /twitter\.com/i,
    /x\.com/i,
    /linkedin\.com/i, 
    /reddit\.com/i,   
    /discord\.com/i,
    /whatsapp\.com/i,
    /telegram\.org/i,
    /pinterest\.com/i,
    /tumblr\.com/i
  ],
  'Relaxation': [
    /youtube\.com\/watch/i, // Will now correctly NOT match the 'Learning' videos
    /netflix\.com/i,
    /hulu\.com/i,
    /disneyplus\.com/i,
    /primevideo\.com/i,
    /spotify\.com/i,
    /twitch\.tv/i,
    /soundcloud\.com/i,
    /vimeo\.com/i,
    /chess\.com/i,
    /lichess\.org/i,
    /steam/i
  ],
  'Communication': [
    /mail\.google\.com/i,
    /outlook\.live\.com/i,
    /outlook\.office\.com/i,
    /slack\.com/i,
    /teams\.microsoft\.com/i,
    /zoom\.us/i,
    /meet\.google\.com/i,
    /webex\.com/i,
    /calendar\.google\.com/i
  ], 
 
};

function categorizeByUrlPattern(url) {
  for (const [category, patterns] of Object.entries(URL_PATTERNS)) {
    if (patterns.some(pattern => pattern.test(url))) {
      return category;
    }
  }
  return null; // No pattern match, will need AI categorization
}

const CATEGORY_SYSTEM_PROMPT = `You are an expert AI categorizer for digital wellness tracking. Your task is to classify web browsing sessions into exactly ONE category.

Categories and their definitions:

**Focused Work** - Professional productivity, active creation, deep work
Examples: Writing documents, coding projects, design work, data analysis, project management

**Learning** - Intentional skill development and education
Examples: Online courses, tutorials, educational videos, coding practice, language learning, how-to guides

**Research** - Active information gathering with purpose
Examples: Reading documentation, technical articles, Stack Overflow problem-solving, Wikipedia research, academic papers

**Social Connection** - Social platforms and community interaction
Examples: Social media (Facebook, Instagram, Twitter/X, LinkedIn, Reddit, Discord), but NOT passive scrolling

**Relaxation** - Intentional entertainment and leisure
Examples: Streaming services, music, podcasts, games, hobby content

**Mindless Scroll** - Passive consumption without purpose
Examples: Excessive social media browsing, clickbait articles, infinite scrolling, short-form video feeds (TikTok, Instagram Reels, YouTube Shorts)

**Communication** - Email and professional messaging
Examples: Gmail, Outlook, Slack, Teams, Zoom, Google Meet, Calendar

**Uncategorized** - Cannot confidently determine OR system/browser pages

IMPORTANT RULES:
1. Respond with ONLY the exact category name (e.g., "Focused Work")
2. Default to "Research" for technical/documentation sites
3. Default to "Mindless Scroll" for social media unless context clearly indicates purposeful use
4. Default to "Uncategorized" only when truly uncertain
5. YouTube can be Learning (tutorials), Relaxation (entertainment), or Mindless Scroll (shorts) - use title to decide

Make your decision based on:
- URL domain and path
- Page title keywords
- Implied user intent`;

async function categorizeSession(url, title) {
  try {
    // First, try pattern-based categorization (instant, no API cost)
    const patternCategory = categorizeByUrlPattern(url);

    if (patternCategory) {
      console.log(`Pattern match: ${url} -> ${patternCategory}`);

      const { data: category, error } = await supabase
        .from('categories')
        .select('id')
        .eq('name', patternCategory)
        .single();

      if (!error && category) {
        return category.id;
      }
    }

    // Fallback to AI categorization if no pattern match
    console.log(`Using AI for: ${url}`);

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
  batchCategorize,
  categorizeByUrlPattern
};
