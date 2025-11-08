-- Migration 002: Add Authentication and User Relations
-- This migration adds user authentication through Supabase Auth
-- and creates foreign key relationships to tie all data to users

-- Note: Supabase Auth automatically provides the auth.users table
-- We'll create a public.users table to store additional user metadata

-- Create users profile table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can only read their own profile
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Add user_id column to categories table
-- Categories can be global (user_id = NULL) or user-specific
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT FALSE;

-- Create index for user-specific categories
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);

-- Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Users can see global categories and their own categories
CREATE POLICY "Users can view global and own categories"
  ON public.categories
  FOR SELECT
  USING (is_global = TRUE OR user_id = auth.uid());

-- Users can create their own categories
CREATE POLICY "Users can create own categories"
  ON public.categories
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own categories
CREATE POLICY "Users can update own categories"
  ON public.categories
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own categories
CREATE POLICY "Users can delete own categories"
  ON public.categories
  FOR DELETE
  USING (user_id = auth.uid());

-- Add user_id column to sessions table (nullable first to handle existing data)
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

-- Delete any existing sessions without a user (old anonymous data)
DELETE FROM public.sessions WHERE user_id IS NULL;

-- Now make the column NOT NULL since we've cleaned up
ALTER TABLE public.sessions
  ALTER COLUMN user_id SET NOT NULL;

-- Create index for user sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);

-- Enable RLS on sessions
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own sessions
CREATE POLICY "Users can view own sessions"
  ON public.sessions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own sessions"
  ON public.sessions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sessions"
  ON public.sessions
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own sessions"
  ON public.sessions
  FOR DELETE
  USING (user_id = auth.uid());

-- Add user_id column to wellness_scores table (nullable first to handle existing data)
ALTER TABLE public.wellness_scores
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

-- Delete any existing wellness scores without a user (old anonymous data)
DELETE FROM public.wellness_scores WHERE user_id IS NULL;

-- Now make the column NOT NULL since we've cleaned up
ALTER TABLE public.wellness_scores
  ALTER COLUMN user_id SET NOT NULL;

-- Update unique constraint on date to include user_id
ALTER TABLE public.wellness_scores
  DROP CONSTRAINT IF EXISTS wellness_scores_date_key;

-- Create composite unique constraint for date + user_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_wellness_scores_date_user
  ON public.wellness_scores(date, user_id);

-- Create index for user wellness scores
CREATE INDEX IF NOT EXISTS idx_wellness_scores_user_id ON public.wellness_scores(user_id);

-- Enable RLS on wellness_scores
ALTER TABLE public.wellness_scores ENABLE ROW LEVEL SECURITY;

-- Users can only access their own wellness scores
CREATE POLICY "Users can view own wellness scores"
  ON public.wellness_scores
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own wellness scores"
  ON public.wellness_scores
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own wellness scores"
  ON public.wellness_scores
  FOR UPDATE
  USING (user_id = auth.uid());

-- Add user_id column to reflections table (nullable first to handle existing data)
ALTER TABLE public.reflections
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

-- Delete any existing reflections without a user (old anonymous data)
DELETE FROM public.reflections WHERE user_id IS NULL;

-- Now make the column NOT NULL since we've cleaned up
ALTER TABLE public.reflections
  ALTER COLUMN user_id SET NOT NULL;

-- Create index for user reflections
CREATE INDEX IF NOT EXISTS idx_reflections_user_id ON public.reflections(user_id);

-- Enable RLS on reflections
ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;

-- Users can only access their own reflections
CREATE POLICY "Users can view own reflections"
  ON public.reflections
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own reflections"
  ON public.reflections
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own reflections"
  ON public.reflections
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own reflections"
  ON public.reflections
  FOR DELETE
  USING (user_id = auth.uid());

-- Mark existing default categories as global
UPDATE public.categories
SET is_global = TRUE, user_id = NULL
WHERE name IN (
  'Focused Work',
  'Learning',
  'Research',
  'Social Connection',
  'Relaxation',
  'Mindless Scroll',
  'Communication',
  'Uncategorized'
);

-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, avatar_url, created_at, updated_at, last_login_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update last_login_at on user login
CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET last_login_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update last_login_at when user signs in
DROP TRIGGER IF EXISTS on_user_login ON auth.users;
CREATE TRIGGER on_user_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at)
  EXECUTE FUNCTION public.update_last_login();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.users IS 'User profiles extending Supabase Auth users';
COMMENT ON COLUMN public.categories.user_id IS 'NULL for global categories, set for user-specific categories';
COMMENT ON COLUMN public.categories.is_global IS 'TRUE for default categories available to all users';
COMMENT ON COLUMN public.sessions.user_id IS 'Foreign key to users table - all sessions belong to a user';
COMMENT ON COLUMN public.wellness_scores.user_id IS 'Foreign key to users table - wellness scores are per user';
COMMENT ON COLUMN public.reflections.user_id IS 'Foreign key to users table - reflections are per user';
