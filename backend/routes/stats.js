const express = require('express');
const router = express.Router();
const supabase = require('../db/database');
const wellnessService = require('../services/wellness');

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

module.exports = router;
