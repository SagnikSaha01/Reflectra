const express = require('express');
const router = express.Router();
const db = require('../db/database');
const reflectionService = require('../services/reflection');

// Ask a reflection question
router.post('/ask', async (req, res) => {
  const { query, timeRange } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    const response = await reflectionService.generateReflection(query, timeRange);

    // Save reflection to database
    db.prepare(`
      INSERT INTO reflections (query, response, context, timestamp)
      VALUES (?, ?, ?, ?)
    `).run(query, response.answer, JSON.stringify(response.context), Date.now());

    res.json(response);
  } catch (error) {
    console.error('Reflection error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get reflection history
router.get('/history', (req, res) => {
  const { limit = 20 } = req.query;

  try {
    const reflections = db.prepare(`
      SELECT id, query, response, timestamp
      FROM reflections
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(parseInt(limit));

    res.json(reflections);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific reflection
router.get('/:id', (req, res) => {
  const { id } = req.params;

  try {
    const reflection = db.prepare('SELECT * FROM reflections WHERE id = ?').get(id);

    if (!reflection) {
      return res.status(404).json({ error: 'Reflection not found' });
    }

    res.json(reflection);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
