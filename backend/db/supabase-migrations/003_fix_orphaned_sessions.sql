-- Migration 003: Fix Orphaned Sessions
-- This migration assigns orphaned sessions (with NULL user_id) to the first user
-- Only run this if you have sessions that were created before authentication was set up

-- First, check if there are any orphaned sessions
DO $$
DECLARE
  orphaned_count INTEGER;
  first_user_id UUID;
BEGIN
  -- Count orphaned sessions
  SELECT COUNT(*) INTO orphaned_count
  FROM public.sessions
  WHERE user_id IS NULL;

  IF orphaned_count > 0 THEN
    RAISE NOTICE 'Found % orphaned sessions', orphaned_count;

    -- Get the first user (or your specific user ID)
    SELECT id INTO first_user_id
    FROM public.users
    ORDER BY created_at ASC
    LIMIT 1;

    IF first_user_id IS NOT NULL THEN
      -- Assign orphaned sessions to the first user
      UPDATE public.sessions
      SET user_id = first_user_id
      WHERE user_id IS NULL;

      RAISE NOTICE 'Assigned % sessions to user %', orphaned_count, first_user_id;
    ELSE
      RAISE NOTICE 'No users found in database. Cannot assign orphaned sessions.';
    END IF;
  ELSE
    RAISE NOTICE 'No orphaned sessions found';
  END IF;
END $$;

-- Do the same for wellness_scores
DO $$
DECLARE
  orphaned_count INTEGER;
  first_user_id UUID;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM public.wellness_scores
  WHERE user_id IS NULL;

  IF orphaned_count > 0 THEN
    RAISE NOTICE 'Found % orphaned wellness scores', orphaned_count;

    SELECT id INTO first_user_id
    FROM public.users
    ORDER BY created_at ASC
    LIMIT 1;

    IF first_user_id IS NOT NULL THEN
      UPDATE public.wellness_scores
      SET user_id = first_user_id
      WHERE user_id IS NULL;

      RAISE NOTICE 'Assigned % wellness scores to user %', orphaned_count, first_user_id;
    END IF;
  ELSE
    RAISE NOTICE 'No orphaned wellness scores found';
  END IF;
END $$;

-- Do the same for reflections
DO $$
DECLARE
  orphaned_count INTEGER;
  first_user_id UUID;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM public.reflections
  WHERE user_id IS NULL;

  IF orphaned_count > 0 THEN
    RAISE NOTICE 'Found % orphaned reflections', orphaned_count;

    SELECT id INTO first_user_id
    FROM public.users
    ORDER BY created_at ASC
    LIMIT 1;

    IF first_user_id IS NOT NULL THEN
      UPDATE public.reflections
      SET user_id = first_user_id
      WHERE user_id IS NULL;

      RAISE NOTICE 'Assigned % reflections to user %', orphaned_count, first_user_id;
    END IF;
  ELSE
    RAISE NOTICE 'No orphaned reflections found';
  END IF;
END $$;

-- Verify the results
SELECT
  'sessions' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE user_id IS NULL) as orphaned,
  COUNT(DISTINCT user_id) as unique_users
FROM public.sessions
UNION ALL
SELECT
  'wellness_scores' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE user_id IS NULL) as orphaned,
  COUNT(DISTINCT user_id) as unique_users
FROM public.wellness_scores
UNION ALL
SELECT
  'reflections' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE user_id IS NULL) as orphaned,
  COUNT(DISTINCT user_id) as unique_users
FROM public.reflections;
