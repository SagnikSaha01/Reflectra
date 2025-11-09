const express = require('express');
const router = express.Router();
const supabase = require('../db/database');
const categorizationService = require('../services/categorization');
const vectorStore = require('../services/vectorStore');

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
    // Check for recent sessions with the same URL (last 2 minutes)
    // This catches auto-save chunks that should be merged together
    const lookbackWindow = 120000; // 2 minutes
    const { data: recentSessions, error: fetchError } = await supabase
      .from('sessions')
      .select('*')
      .eq('url', url)
      .gte('timestamp', timestamp - lookbackWindow)
      .order('timestamp', { ascending: false });

    if (fetchError) {
      console.error('Error checking for duplicates:', fetchError);
    }

    // Find the most recent session for this URL
    // We'll merge into the FIRST session (original) and update its duration
    if (recentSessions && recentSessions.length > 0) {
      // Get the first (original) session for this URL
      const originalSession = recentSessions[recentSessions.length - 1]; // Oldest in the group

      // Check if this is a continuation (within reasonable time gap)
      const timeSinceLastSession = timestamp - (originalSession.timestamp + originalSession.duration);
      const maxGap = 35000; // 35 seconds (allows for 30s auto-save + 5s buffer)

      if (timeSinceLastSession <= maxGap) {
        // This is a continuation - merge with original session
        const mergedDuration = originalSession.duration + duration;

        console.log(`📊 MERGING continuation: "${title}"`);
        console.log(`   Original: ${originalSession.duration}ms, Adding: ${duration}ms, Total: ${mergedDuration}ms`);

        // Update the original session with merged duration
        const { data: updatedData, error: updateError } = await supabase
          .from('sessions')
          .update({ duration: mergedDuration })
          .eq('id', originalSession.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating session duration:', updateError);
          // Fall through to create new session if update fails
        } else {
          // Delete any other duplicate sessions for this URL in the time window
          if (recentSessions.length > 1) {
            const idsToDelete = recentSessions
              .filter(s => s.id !== originalSession.id)
              .map(s => s.id);

            if (idsToDelete.length > 0) {
              await supabase
                .from('sessions')
                .delete()
                .in('id', idsToDelete);

              console.log(`🗑️  Deleted ${idsToDelete.length} duplicate sessions`);
            }
          }

          // Update vector store with merged duration
          try {
            await vectorStore.upsertSessionEmbedding({
              id: updatedData.id,
              url: updatedData.url,
              title: updatedData.title,
              duration: updatedData.duration,
              timestamp: updatedData.timestamp
            });
          } catch (vectorError) {
            console.error('Vector store sync failed:', vectorError.message);
          }

          return res.status(200).json({ ...updatedData, merged: true });
        }
      }
    }

    // No duplicate found, create new session
    // Try to categorize immediately using pattern matching
    const categoryId = await categorizationService.categorizeSession(url, title);

    // Insert session with category if found
    const { data, error } = await supabase
      .from('sessions')
      .insert([{
        url,
        title,
        duration,
        timestamp,
        category_id: categoryId // Will be null if no match, gets categorized later by cron job
      }])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    try {
      await vectorStore.upsertSessionEmbedding({
        id: data.id,
        url,
        title,
        duration,
        timestamp
      });
    } catch (vectorError) {
      console.error('Vector store sync failed:', vectorError.message);
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

// Clean up duplicate sessions (merge sessions with same URL within 2 minutes)
router.post('/cleanup-duplicates', async (req, res) => {
  try {
    console.log('Starting duplicate cleanup...');

    // Get all sessions ordered by timestamp
    const { data: allSessions, error: fetchError } = await supabase
      .from('sessions')
      .select('*')
      .order('timestamp', { ascending: true });

    if (fetchError) {
      return res.status(500).json({ error: fetchError.message });
    }

    let merged = 0;
    let deleted = 0;
    const processedIds = new Set();

    // Group sessions by URL
    const sessionsByUrl = {};
    for (const session of allSessions) {
      if (!sessionsByUrl[session.url]) {
        sessionsByUrl[session.url] = [];
      }
      sessionsByUrl[session.url].push(session);
    }

    // Process each URL group
    for (const [url, sessions] of Object.entries(sessionsByUrl)) {
      if (sessions.length === 1) continue;

      let currentGroup = [sessions[0]];

      for (let i = 1; i < sessions.length; i++) {
        const prev = currentGroup[currentGroup.length - 1];
        const curr = sessions[i];

        // Check if this session is within 2 minutes of the last session in group
        const timeSinceLast = curr.timestamp - (prev.timestamp + prev.duration);
        const maxGap = 120000; // 2 minutes

        if (timeSinceLast <= maxGap && !processedIds.has(curr.id)) {
          // Part of the same group
          currentGroup.push(curr);
        } else {
          // New group - merge the old group if it has multiple sessions
          if (currentGroup.length > 1) {
            const result = await mergeSessionGroup(currentGroup);
            merged += result.merged;
            deleted += result.deleted;
            currentGroup.forEach(s => processedIds.add(s.id));
          }
          currentGroup = [curr];
        }
      }

      // Merge final group if needed
      if (currentGroup.length > 1) {
        const result = await mergeSessionGroup(currentGroup);
        merged += result.merged;
        deleted += result.deleted;
      }
    }

    console.log(`Cleanup complete: Merged ${merged} groups, deleted ${deleted} duplicates`);
    res.json({
      success: true,
      merged,
      deleted,
      message: `Merged ${merged} session groups, deleted ${deleted} duplicate sessions`
    });
  } catch (error) {
    console.error('Error cleaning up duplicates:', error);
    res.status(500).json({ error: error.message });
  }
});

async function mergeSessionGroup(sessions) {
  if (sessions.length <= 1) return { merged: 0, deleted: 0 };

  // Keep the first session and merge all others into it
  const original = sessions[0];
  const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0);

  // Update the original session with total duration
  await supabase
    .from('sessions')
    .update({ duration: totalDuration })
    .eq('id', original.id);

  // Delete all other sessions in the group
  const idsToDelete = sessions.slice(1).map(s => s.id);
  if (idsToDelete.length > 0) {
    await supabase
      .from('sessions')
      .delete()
      .in('id', idsToDelete);
  }

  console.log(`Merged ${sessions.length} sessions for "${original.title}" - Total: ${totalDuration}ms`);

  return { merged: 1, deleted: idsToDelete.length };
}

module.exports = router;
