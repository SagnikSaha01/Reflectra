-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT,
  wellness_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id BIGSERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT,
  duration INTEGER NOT NULL,
  timestamp BIGINT NOT NULL,
  category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create wellness_scores table
CREATE TABLE IF NOT EXISTS wellness_scores (
  id BIGSERIAL PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  score REAL NOT NULL,
  focus_time INTEGER,
  learning_time INTEGER,
  rest_time INTEGER,
  social_time INTEGER,
  mindless_time INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reflections table
CREATE TABLE IF NOT EXISTS reflections (
  id BIGSERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  context TEXT,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sessions_timestamp ON sessions(timestamp);
CREATE INDEX IF NOT EXISTS idx_sessions_category ON sessions(category_id);
CREATE INDEX IF NOT EXISTS idx_wellness_scores_date ON wellness_scores(date);

-- Insert default categories
INSERT INTO categories (name, description, color, wellness_type) VALUES
  ('Focused Work', 'Deep work and productivity', '#4CAF50', 'productive'),
  ('Learning', 'Educational content and skill development', '#2196F3', 'growth'),
  ('Research', 'Information gathering and exploration', '#9C27B0', 'growth'),
  ('Social Connection', 'Meaningful social interactions', '#FF9800', 'social'),
  ('Relaxation', 'Intentional rest and recovery', '#00BCD4', 'rest'),
  ('Mindless Scroll', 'Passive content consumption', '#F44336', 'drain'),
  ('Communication', 'Email, messaging, and collaboration', '#FFC107', 'productive'),
  ('Uncategorized', 'Sessions awaiting categorization', '#9E9E9E', 'unknown')
ON CONFLICT (name) DO NOTHING;
