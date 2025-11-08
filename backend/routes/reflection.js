const express = require('express');
const router = express.Router();
const supabase = require('../db/database');
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
    const { error } = await supabase
      .from('reflections')
      .insert([{
        query,
        response: response.answer,
        context: JSON.stringify(response.context),
        timestamp: Date.now()
      }]);

    if (error) {
      console.error('Error saving reflection:', error.message);
    }

    res.json(response);
  } catch (error) {
    console.error('Reflection error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get reflection history
router.get('/history', async (req, res) => {
  const { limit = 20 } = req.query;

  try {
    const { data: reflections, error } = await supabase
      .from('reflections')
      .select('id, query, response, timestamp')
      .order('timestamp', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(reflections);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific reflection
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { data: reflection, error } = await supabase
      .from('reflections')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Reflection not found' });
      }
      return res.status(500).json({ error: error.message });
    }

    res.json(reflection);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
