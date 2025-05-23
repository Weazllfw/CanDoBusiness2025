-- supabase/migrations/YYYYMMDDHHMMSS_setup_pgcron_trust_score_updates.sql

BEGIN;

-- Enable pg_cron extension if not already enabled
-- Ensure it is created in the 'extensions' schema as Supabase prefers
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
-- Grant usage on the schema to postgres to allow pg_cron to operate, if necessary
-- depending on default privileges. Supabase usually handles this, but being explicit can help.
GRANT USAGE ON SCHEMA extensions TO postgres;
GRANT USAGE ON SCHEMA cron TO postgres; -- pg_cron functions are in the cron schema

-- 1. Create the batch update function
-- This function iterates through active users and calls the existing
-- internal.update_user_trust_level for each.
CREATE OR REPLACE FUNCTION internal.batch_update_all_user_trust_levels()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- To run with privileges to update all profiles
AS $$
DECLARE
    r RECORD;
BEGIN
    RAISE LOG 'Starting batch_update_all_user_trust_levels';
    FOR r IN 
        SELECT id 
        FROM public.profiles 
        WHERE status = 'active' -- Or any other criteria for users to update
    LOOP
        BEGIN
            -- Call the existing function that calculates score, level, and updates the profile
            PERFORM internal.update_user_trust_level(r.id);
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to update trust level for user %: %', r.id, SQLERRM;
                -- Continue to the next user even if one fails
        END;
    END LOOP;
    RAISE LOG 'Finished batch_update_all_user_trust_levels';
END;
$$;

COMMENT ON FUNCTION internal.batch_update_all_user_trust_levels() IS 'Scheduled task to iterate through active users and update their trust levels by calling internal.update_user_trust_level.';

-- Grant execute on this function to the postgres superuser (or the user pg_cron runs as)
GRANT EXECUTE ON FUNCTION internal.batch_update_all_user_trust_levels() TO postgres;


-- 2. Schedule the batch update function using pg_cron
-- Make sure to reference functions in the cron schema explicitly if search_path is not set for cron jobs
-- For example, extensions.cron_schedule or cron.schedule depending on how pg_cron is set up.
-- SELECT cron.unschedule('daily-trust-level-updates');
-- SELECT cron.schedule(

-- First, try to unschedule any existing job with the same name to ensure idempotency
DO $$
BEGIN
    PERFORM cron.unschedule('daily-trust-level-updates');
    RAISE NOTICE 'Job "daily-trust-level-updates" unscheduled if it existed.';
EXCEPTION
    WHEN OTHERS THEN -- Catches errors, including if the job does not exist
        RAISE NOTICE 'Job "daily-trust-level-updates" did not exist or could not be unscheduled: %', SQLERRM;
END;
$$;

-- Then, schedule the new job
SELECT cron.schedule(
    'daily-trust-level-updates', 
    '0 2 * * *', -- Daily at 2:00 AM UTC
    $$SELECT internal.batch_update_all_user_trust_levels();$$
);

COMMENT ON EXTENSION pg_cron IS 'pg_cron is used to schedule the periodic update of user trust levels.';

COMMIT;

DO $$ BEGIN
  RAISE NOTICE 'pg_cron extension enabled (if not already) and job "daily-trust-level-updates" scheduled.';
END $$; 