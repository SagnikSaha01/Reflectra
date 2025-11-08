const { createClient } = require('@supabase/supabase-js');

// Supabase configuration from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_KEY in your .env file');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize database (run migrations if needed)
async function initializeDatabase() {
  try {
    // Check if categories table has data
    const { data: categories, error } = await supabase
      .from('categories')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Database connection error:', error.message);
      console.log('Please run the migration file: backend/db/supabase-migrations/001_initial_schema.sql');
      console.log('in your Supabase SQL Editor');
      return;
    }

    // Insert default categories if table is empty
    if (!categories || categories.length === 0) {
      const defaultCategories = [
        { name: 'Focused Work', description: 'Deep work, coding, writing, professional tasks', color: '#4CAF50', wellness_type: 'productive' },
        { name: 'Learning', description: 'Educational content, tutorials, courses, documentation', color: '#2196F3', wellness_type: 'growth' },
        { name: 'Research', description: 'Information gathering, reading articles, exploration', color: '#9C27B0', wellness_type: 'growth' },
        { name: 'Social Connection', description: 'Social media, messaging, community engagement', color: '#FF9800', wellness_type: 'social' },
        { name: 'Relaxation', description: 'Entertainment, videos, music, leisure browsing', color: '#00BCD4', wellness_type: 'rest' },
        { name: 'Mindless Scroll', description: 'Unfocused browsing, excessive social media', color: '#F44336', wellness_type: 'drain' },
        { name: 'Communication', description: 'Email, chat, professional communication', color: '#607D8B', wellness_type: 'productive' },
        { name: 'Uncategorized', description: 'Not yet categorized', color: '#9E9E9E', wellness_type: 'unknown' }
      ];

      const { error: insertError } = await supabase
        .from('categories')
        .insert(defaultCategories);

      if (insertError && !insertError.message.includes('duplicate')) {
        console.error('Error inserting default categories:', insertError.message);
      } else {
        console.log('Default categories inserted successfully');
      }
    }

    console.log('Database connection established successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Initialize on module load
initializeDatabase();

module.exports = supabase;
