const express = require('express');
const router = express.Router();
const supabase = require('../db/database');
const categorizationService = require('../services/categorization');

// Get all sessions with optional filters
router.get('/', async (req, res) => {
  const { startDate, endDate, categoryId, limit = 100 } = req.query;

  try {
    let query = supabase
      .from('sessions')
      .select(`
        *,
        categories:category_id (
          name,
          color
        )
      `)
      .order('timestamp', { ascending: false })
      .limit(parseInt(limit));

    if (startDate) {
      query = query.gte('timestamp', parseInt(startDate));
    }

    if (endDate) {
      query = query.lte('timestamp', parseInt(endDate));
    }

    if (categoryId) {
      query = query.eq('category_id', parseInt(categoryId));
    }

    const { data: sessions, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Flatten the nested category data
    const flattenedSessions = sessions.map(session => ({
      ...session,
      category_name: session.categories?.name || null,
      category_color: session.categories?.color || null,
      categories: undefined
    }));

    res.json(flattenedSessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new session
router.post('/', async (req, res) => {
  const { url, title, duration, timestamp } = req.body;

  if (!url || !duration || !timestamp) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { data, error } = await supabase
      .from('sessions')
      .insert([{ url, title, duration, timestamp }])
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
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { data: session, error } = await supabase
      .from('sessions')
      .select(`
        *,
        categories:category_id (
          name,
          color
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Session not found' });
      }
      return res.status(500).json({ error: error.message });
    }

    // Flatten the nested category data
    const flattenedSession = {
      ...session,
      category_name: session.categories?.name || null,
      category_color: session.categories?.color || null,
      categories: undefined
    };

    res.json(flattenedSession);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update session category
router.patch('/:id/category', async (req, res) => {
  const { id } = req.params;
  const { categoryId } = req.body;

  try {
    const { data, error } = await supabase
      .from('sessions')
      .update({ category_id: categoryId })
      .eq('id', id)
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
