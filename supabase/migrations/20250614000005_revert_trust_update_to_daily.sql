-- supabase/migrations/20250614000005_revert_trust_update_to_daily.sql
BEGIN;

DO $$ BEGIN
    RAISE NOTICE 'Attempting to revert "daily-trust-level-updates" cron job to run daily at 2 AM UTC.';
END $$;

-- Try to unschedule any existing job with this name
DO $$
BEGIN
    PERFORM cron.unschedule('daily-trust-level-updates');
    RAISE NOTICE 'Job "daily-trust-level-updates" unscheduled if it existed.';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Job "daily-trust-level-updates" did not exist or could not be unscheduled: %', SQLERRM;
END;
$$;

-- Schedule the job to run daily
SELECT cron.schedule(
    'daily-trust-level-updates', 
    '0 2 * * *',  -- Daily at 2 AM UTC
    $$SELECT internal.batch_update_all_user_trust_levels();$$
);

DO $$ BEGIN
    RAISE NOTICE 'Job "daily-trust-level-updates" is NOW SCHEDULED TO RUN DAILY AT 2 AM UTC.';
END $$;

COMMIT; 