const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../data/mindtime.db');
const dbDir = path.dirname(dbPath);

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      title TEXT,
      duration INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      category_id INTEGER,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      color TEXT,
      wellness_type TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS wellness_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      score REAL NOT NULL,
      focus_time INTEGER,
      learning_time INTEGER,
      rest_time INTEGER,
      social_time INTEGER,
      mindless_time INTEGER,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS reflections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      response TEXT NOT NULL,
      context TEXT,
      timestamp INTEGER NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_timestamp ON sessions(timestamp);
    CREATE INDEX IF NOT EXISTS idx_sessions_category ON sessions(category_id);
    CREATE INDEX IF NOT EXISTS idx_wellness_scores_date ON wellness_scores(date);
  `);

  // Insert default categories if they don't exist
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

  const insertCategory = db.prepare(`
    INSERT OR IGNORE INTO categories (name, description, color, wellness_type)
    VALUES (?, ?, ?, ?)
  `);

  defaultCategories.forEach(cat => {
    insertCategory.run(cat.name, cat.description, cat.color, cat.wellness_type);
  });

  console.log('Database initialized successfully');
}

initializeDatabase();

module.exports = db;
