# Supabase Migrations

## How to Run Migrations

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Create a new query
4. Copy and paste the SQL from the migration files in order
5. Execute each migration

## Migration Files

### 001_initial_schema.sql
Creates the initial database schema:
- `categories` - Activity categories with wellness types
- `sessions` - Browsing session records
- `wellness_scores` - Daily wellness scores
- `reflections` - User reflection queries and responses

**Status:** Should already be applied

### 002_daily_insights.sql
Creates the insights caching table:
- `daily_insights` - Stores AI-generated insights to avoid regenerating multiple times per day

**Status:** NEW - Run this migration if you haven't already

## Running the New Migration

To add the daily_insights table, run this in your Supabase SQL Editor:

```sql
-- Create daily_insights table for caching AI-generated insights
CREATE TABLE IF NOT EXISTS daily_insights (
  id BIGSERIAL PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  insight_text TEXT NOT NULL,
  suggestions JSONB NOT NULL DEFAULT '[]',
  metadata JSONB,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for date lookups
CREATE INDEX IF NOT EXISTS idx_daily_insights_date ON daily_insights(date);

-- Add comment for documentation
COMMENT ON TABLE daily_insights IS 'Stores AI-generated daily insights to avoid regenerating them multiple times per day';
```

This will enable insights caching so they only generate once per day unless manually refreshed.
