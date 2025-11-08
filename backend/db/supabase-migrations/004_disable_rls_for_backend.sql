-- Migration 004: Disable RLS for backend-managed auth
-- Since the Node.js backend handles authentication via middleware,
-- we don't need RLS policies. The backend filters by user_id in queries.

-- Disable RLS on all tables
ALTER TABLE public.sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.wellness_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reflections DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Drop all existing RLS policies
DROP POLICY IF EXISTS "Users can view own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can create own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.sessions;

DROP POLICY IF EXISTS "Users can view own wellness scores" ON public.wellness_scores;
DROP POLICY IF EXISTS "Users can create own wellness scores" ON public.wellness_scores;
DROP POLICY IF EXISTS "Users can update own wellness scores" ON public.wellness_scores;
DROP POLICY IF EXISTS "Users can delete own wellness scores" ON public.wellness_scores;

DROP POLICY IF EXISTS "Users can view own reflections" ON public.reflections;
DROP POLICY IF EXISTS "Users can create own reflections" ON public.reflections;
DROP POLICY IF EXISTS "Users can update own reflections" ON public.reflections;
DROP POLICY IF EXISTS "Users can delete own reflections" ON public.reflections;

DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can create own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can update own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON public.categories;

-- Note: The Node.js backend already filters all queries by req.user.id
-- which is extracted from the validated JWT token in the auth middleware.
-- This provides proper data isolation without needing RLS.
