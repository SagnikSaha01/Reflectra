-- Migration 005: Reassign all sessions to the currently logged-in user
-- This fixes sessions that were created with a different user_id

-- First, let's see what we have
SELECT
  'Before update' as status,
  COUNT(*) as total_sessions,
  COUNT(DISTINCT user_id) as unique_users
FROM public.sessions;

-- Get your current user (the one with email mousumisanket997@gmail.com)
DO $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get the user ID for mousumisanket997@gmail.com
  SELECT id INTO current_user_id
  FROM auth.users
  WHERE email = 'mousumisanket997@gmail.com'
  LIMIT 1;

  IF current_user_id IS NOT NULL THEN
    RAISE NOTICE 'Found user: %', current_user_id;

    -- Update ALL sessions to this user
    UPDATE public.sessions
    SET user_id = current_user_id;

    RAISE NOTICE 'Updated all sessions to user %', current_user_id;

    -- Update wellness_scores too
    UPDATE public.wellness_scores
    SET user_id = current_user_id;

    RAISE NOTICE 'Updated all wellness_scores to user %', current_user_id;

    -- Update reflections too
    UPDATE public.reflections
    SET user_id = current_user_id;

    RAISE NOTICE 'Updated all reflections to user %', current_user_id;
  ELSE
    RAISE NOTICE 'User not found with email mousumisanket997@gmail.com';
  END IF;
END $$;

-- Verify the results
SELECT
  'After update' as status,
  COUNT(*) as total_sessions,
  COUNT(DISTINCT user_id) as unique_users,
  user_id
FROM public.sessions
GROUP BY user_id;
