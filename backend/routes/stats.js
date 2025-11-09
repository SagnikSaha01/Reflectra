const express = require('express');
const router = express.Router();
const supabase = require('../db/database');
const wellnessService = require('../services/wellness');
const openai = require('../services/openaiClient');

// Get today's stats
router.get('/today', async (req, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTimestamp = todayStart.getTime();

  try {
    // Get session count and total time
    const { data: sessions, error: sessionError } = await supabase
      .from('sessions')
      .select('duration')
      .gte('timestamp', todayTimestamp);

    if (sessionError) {
      return res.status(500).json({ error: sessionError.message });
    }

    const summary = {
      sessionCount: sessions.length,
      totalTime: sessions.reduce((sum, s) => sum + s.duration, 0)
    };

    // Get time by category
    const { data: categoryStats, error: categoryError } = await supabase
      .from('sessions')
      .select(`
        duration,
        categories:category_id (
          name,
          color
        )
      `)
      .gte('timestamp', todayTimestamp);

    if (categoryError) {
      return res.status(500).json({ error: categoryError.message });
    }

    // Aggregate by category
    const categoryMap = {};
    categoryStats.forEach(session => {
      const categoryName = session.categories?.name || 'Uncategorized';
      const categoryColor = session.categories?.color || '#9E9E9E';

      if (!categoryMap[categoryName]) {
        categoryMap[categoryName] = {
          name: categoryName,
          color: categoryColor,
          time: 0,
          count: 0
        };
      }

      categoryMap[categoryName].time += session.duration;
      categoryMap[categoryName].count += 1;
    });

    const categories = Object.values(categoryMap).sort((a, b) => b.time - a.time);

    // Calculate wellness score
    const wellnessScore = wellnessService.calculateDailyScore(categories);

    res.json({
      sessionCount: summary.sessionCount || 0,
      totalTime: summary.totalTime || 0,
      categories: categories,
      wellnessScore: wellnessScore
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get stats for date range
router.get('/range', async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate required' });
  }

  try {
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('timestamp, duration')
      .gte('timestamp', parseInt(startDate))
      .lte('timestamp', parseInt(endDate))
      .order('timestamp');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Group by date
    const statsByDate = {};
    sessions.forEach(session => {
      const date = new Date(session.timestamp).toISOString().split('T')[0];

      if (!statsByDate[date]) {
        statsByDate[date] = {
          date,
          sessionCount: 0,
          totalTime: 0
        };
      }

      statsByDate[date].sessionCount += 1;
      statsByDate[date].totalTime += session.duration;
    });

    const stats = Object.values(statsByDate).sort((a, b) => a.date.localeCompare(b.date));

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get category breakdown for a time period
router.get('/categories', async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    let query = supabase
      .from('sessions')
      .select(`
        duration,
        categories:category_id (
          name,
          color,
          wellness_type
        )
      `);

    if (startDate && endDate) {
      query = query
        .gte('timestamp', parseInt(startDate))
        .lte('timestamp', parseInt(endDate));
    }

    const { data: sessions, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Aggregate by category
    const categoryMap = {};
    sessions.forEach(session => {
      const categoryName = session.categories?.name || 'Uncategorized';
      const categoryColor = session.categories?.color || '#9E9E9E';
      const wellnessType = session.categories?.wellness_type || 'unknown';

      if (!categoryMap[categoryName]) {
        categoryMap[categoryName] = {
          name: categoryName,
          color: categoryColor,
          wellness_type: wellnessType,
          totalTime: 0,
          sessionCount: 0,
          durations: []
        };
      }

      categoryMap[categoryName].totalTime += session.duration;
      categoryMap[categoryName].sessionCount += 1;
      categoryMap[categoryName].durations.push(session.duration);
    });

    // Calculate averages and format output
    const stats = Object.values(categoryMap).map(cat => ({
      name: cat.name,
      color: cat.color,
      wellness_type: cat.wellness_type,
      totalTime: cat.totalTime,
      sessionCount: cat.sessionCount,
      avgDuration: cat.totalTime / cat.sessionCount
    })).sort((a, b) => b.totalTime - a.totalTime);

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get wellness score history
router.get('/wellness-history', async (req, res) => {
  const { days = 7 } = req.query;

  try {
    const { data: history, error } = await supabase
      .from('wellness_scores')
      .select('*')
      .order('date', { ascending: false })
      .limit(parseInt(days));

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get AI-generated insights for today's activity
router.get('/insights', async (req, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTimestamp = todayStart.getTime();

  try {
    // Get today's sessions with category info
    const { data: sessions, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        duration,
        title,
        url,
        categories:category_id (
          name,
          color,
          wellness_type
        )
      `)
      .gte('timestamp', todayTimestamp);

    if (sessionError) {
      return res.status(500).json({ error: sessionError.message });
    }

    if (!sessions || sessions.length === 0) {
      return res.json({
        insights: "No activity recorded yet today. Start browsing to get personalized insights!",
        suggestions: []
      });
    }

    // Calculate total time and category breakdown
    const totalTime = sessions.reduce((sum, s) => sum + s.duration, 0);
    const categoryMap = {};

    sessions.forEach(session => {
      const categoryName = session.categories?.name || 'Uncategorized';
      const wellnessType = session.categories?.wellness_type || 'unknown';

      if (!categoryMap[categoryName]) {
        categoryMap[categoryName] = {
          name: categoryName,
          wellnessType: wellnessType,
          time: 0,
          count: 0
        };
      }

      categoryMap[categoryName].time += session.duration;
      categoryMap[categoryName].count += 1;
    });

    const categories = Object.values(categoryMap).sort((a, b) => b.time - a.time);

    // Format time for readability
    const formatTime = (ms) => {
      const minutes = Math.floor(ms / 60000);
      const hours = Math.floor(minutes / 60);
      if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
      }
      return `${minutes}m`;
    };

    // Prepare data for OpenAI
    const activitySummary = {
      totalScreenTime: formatTime(totalTime),
      sessionCount: sessions.length,
      categories: categories.map(cat => ({
        name: cat.name,
        time: formatTime(cat.time),
        percentage: ((cat.time / totalTime) * 100).toFixed(1),
        wellnessType: cat.wellnessType,
        sessionCount: cat.count
      }))
    };

    // Generate insights using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a digital wellness coach. Analyze the user's daily screen time activity and provide thoughtful, personalized insights. Be encouraging but honest. Focus on balance and healthy habits.

Guidelines:
- Keep the main insight to 2-3 sentences
- Provide 3-4 specific, actionable suggestions
- Be positive and supportive in tone
- Consider the wellness type of categories (productive, social, entertainment, etc.)
- Don't be preachy or overly critical`
        },
        {
          role: "user",
          content: `Here's my activity for today:
Total Screen Time: ${activitySummary.totalScreenTime}
Total Sessions: ${activitySummary.sessionCount}

Category Breakdown:
${activitySummary.categories.map(cat =>
  `- ${cat.name}: ${cat.time} (${cat.percentage}%) - ${cat.sessionCount} sessions - Type: ${cat.wellnessType}`
).join('\n')}

Please provide:
1. A brief insight about my screen time today (2-3 sentences)
2. 3-4 specific suggestions for improvement

Format your response as JSON:
{
  "insight": "Your main insight here",
  "suggestions": [
    "Suggestion 1",
    "Suggestion 2",
    "Suggestion 3"
  ]
}`
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content);

    res.json({
      insights: aiResponse.insight,
      suggestions: aiResponse.suggestions || [],
      metadata: {
        totalTime: formatTime(totalTime),
        sessionCount: sessions.length,
        topCategory: categories[0]?.name
      }
    });

  } catch (error) {
    console.error('Error generating insights:', error);

    // Fallback response if OpenAI fails
    res.json({
      insights: "We're having trouble generating insights right now. Keep tracking your activity and check back later!",
      suggestions: [
        "Take regular breaks every hour",
        "Review your most-used categories",
        "Set goals for balanced screen time"
      ],
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
