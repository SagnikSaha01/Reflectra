const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Get all categories
router.get('/', (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new category
router.post('/', (req, res) => {
  const { name, description, color, wellness_type } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO categories (name, description, color, wellness_type)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(name, description, color, wellness_type);

    res.status(201).json({
      id: result.lastInsertRowid,
      name,
      description,
      color,
      wellness_type
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update category
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, color, wellness_type } = req.body;

  const updates = [];
  const params = [];

  if (name) {
    updates.push('name = ?');
    params.push(name);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }
  if (color) {
    updates.push('color = ?');
    params.push(color);
  }
  if (wellness_type) {
    updates.push('wellness_type = ?');
    params.push(wellness_type);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No updates provided' });
  }

  params.push(id);

  try {
    const stmt = db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`);
    const result = stmt.run(...params);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete category
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  try {
    const stmt = db.prepare('DELETE FROM categories WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
