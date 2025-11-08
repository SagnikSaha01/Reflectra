const express = require('express');
const router = express.Router();
const supabase = require('../db/database');

// Get all categories
router.get('/', async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new category
router.post('/', async (req, res) => {
  const { name, description, color, wellness_type } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  try {
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name, description, color, wellness_type }])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update category
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, color, wellness_type } = req.body;

  const updates = {};

  if (name) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (color) updates.color = color;
  if (wellness_type) updates.wellness_type = wellness_type;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No updates provided' });
  }

  try {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete category
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
