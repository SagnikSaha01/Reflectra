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
