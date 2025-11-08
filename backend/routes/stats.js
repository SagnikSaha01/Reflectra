const express = require('express');
const router = express.Router();
const db = require('../db/database');
const wellnessService = require('../services/wellness');

// Get today's stats
router.get('/today', (req, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTimestamp = todayStart.getTime();

  try {
    // Get session count and total time
    const summary = db.prepare(`
      SELECT
        COUNT(*) as sessionCount,
        SUM(duration) as totalTime
      FROM sessions
      WHERE timestamp >= ?
    `).get(todayTimestamp);

    // Get time by category
    const categories = db.prepare(`
      SELECT
        c.name,
        c.color,
        SUM(s.duration) as time,
        COUNT(*) as count
      FROM sessions s
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE s.timestamp >= ?
      GROUP BY c.id, c.name, c.color
      ORDER BY time DESC
    `).all(todayTimestamp);

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
router.get('/range', (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate required' });
  }

  try {
    const stats = db.prepare(`
      SELECT
        DATE(timestamp/1000, 'unixepoch', 'localtime') as date,
        COUNT(*) as sessionCount,
        SUM(duration) as totalTime
      FROM sessions
      WHERE timestamp >= ? AND timestamp <= ?
      GROUP BY date
      ORDER BY date
    `).all(parseInt(startDate), parseInt(endDate));

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get category breakdown for a time period
router.get('/categories', (req, res) => {
  const { startDate, endDate } = req.query;

  let query = `
    SELECT
      c.name,
      c.color,
      c.wellness_type,
      SUM(s.duration) as totalTime,
      COUNT(*) as sessionCount,
      AVG(s.duration) as avgDuration
    FROM sessions s
    LEFT JOIN categories c ON s.category_id = c.id
  `;

  const params = [];

  if (startDate && endDate) {
    query += ' WHERE s.timestamp >= ? AND s.timestamp <= ?';
    params.push(parseInt(startDate), parseInt(endDate));
  }

  query += ' GROUP BY c.id, c.name, c.color, c.wellness_type ORDER BY totalTime DESC';

  try {
    const stats = db.prepare(query).all(...params);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get wellness score history
router.get('/wellness-history', (req, res) => {
  const { days = 7 } = req.query;

  try {
    const history = db.prepare(`
      SELECT * FROM wellness_scores
      ORDER BY date DESC
      LIMIT ?
    `).all(parseInt(days));

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
