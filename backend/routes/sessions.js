const express = require('express');
const router = express.Router();
const db = require('../db/database');
const categorizationService = require('../services/categorization');

// Get all sessions with optional filters
router.get('/', (req, res) => {
  const { startDate, endDate, categoryId, limit = 100 } = req.query;

  let query = 'SELECT s.*, c.name as category_name, c.color as category_color FROM sessions s LEFT JOIN categories c ON s.category_id = c.id';
  const conditions = [];
  const params = [];

  if (startDate) {
    conditions.push('s.timestamp >= ?');
    params.push(parseInt(startDate));
  }

  if (endDate) {
    conditions.push('s.timestamp <= ?');
    params.push(parseInt(endDate));
  }

  if (categoryId) {
    conditions.push('s.category_id = ?');
    params.push(parseInt(categoryId));
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY s.timestamp DESC LIMIT ?';
  params.push(parseInt(limit));

  try {
    const sessions = db.prepare(query).all(...params);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new session
router.post('/', (req, res) => {
  const { url, title, duration, timestamp } = req.body;

  if (!url || !duration || !timestamp) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO sessions (url, title, duration, timestamp)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(url, title, duration, timestamp);

    res.status(201).json({
      id: result.lastInsertRowid,
      url,
      title,
      duration,
      timestamp
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trigger categorization for uncategorized sessions
router.post('/categorize', async (req, res) => {
  try {
    const result = await categorizationService.categorizeUncategorizedSessions();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get session by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;

  try {
    const session = db.prepare(`
      SELECT s.*, c.name as category_name, c.color as category_color
      FROM sessions s
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE s.id = ?
    `).get(id);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update session category
router.patch('/:id/category', (req, res) => {
  const { id } = req.params;
  const { categoryId } = req.body;

  try {
    const stmt = db.prepare('UPDATE sessions SET category_id = ? WHERE id = ?');
    const result = stmt.run(categoryId, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
