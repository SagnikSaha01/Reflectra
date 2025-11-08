const express = require('express');
const router = express.Router();
const supabase = require('../db/database');
const categorizationService = require('../services/categorization');
const { authenticateUser } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateUser);

// Get all sessions with optional filters
router.get('/', async (req, res) => {
  const { startDate, endDate, categoryId, limit = 100 } = req.query;

  try {
    console.log('📊 Sessions GET - User ID:', req.user.id);
    console.log('📊 Sessions GET - Query params:', { startDate, endDate, categoryId, limit });

    let query = supabase
      .from('sessions')
      .select(`
        *,
        categories:category_id (
          name,
          color
        )
      `)
      .eq('user_id', req.user.id)
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
      console.log('❌ Sessions GET - Query error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Sessions GET - Found sessions:', sessions?.length || 0);
    if (sessions && sessions.length > 0) {
      console.log('📊 First session user_id:', sessions[0].user_id);
    }

    // Flatten the nested category data
    const flattenedSessions = sessions.map(session => ({
      ...session,
      category_name: session.categories?.name || null,
      category_color: session.categories?.color || null,
      categories: undefined
    }));

    console.log('📊 Sessions GET - Returning:', flattenedSessions.length, 'sessions');
    res.json(flattenedSessions);
  } catch (error) {
    console.log('❌ Sessions GET - Exception:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new session
router.post('/', async (req, res) => {
  const { url, title, duration, timestamp } = req.body;

  console.log('📝 Sessions POST - Creating session for user:', req.user.id);
  console.log('📝 Sessions POST - Session data:', { url, title, duration, timestamp });

  if (!url || !duration || !timestamp) {
    console.log('❌ Sessions POST - Missing required fields');
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { data, error } = await supabase
      .from('sessions')
      .insert([{
        url,
        title,
        duration,
        timestamp,
        user_id: req.user.id
      }])
      .select()
      .single();

    if (error) {
      console.log('❌ Sessions POST - Insert error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Sessions POST - Session created with ID:', data.id);
    res.status(201).json(data);
  } catch (error) {
    console.log('❌ Sessions POST - Exception:', error);
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
      .eq('user_id', req.user.id)
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
      .eq('user_id', req.user.id)
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
