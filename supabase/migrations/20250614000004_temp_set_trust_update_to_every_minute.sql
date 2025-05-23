-- #############################################################################
-- # TEMPORARY MIGRATION FOR TESTING - TO BE REVERTED/DELETED LATER            #
-- #############################################################################
-- # This migration changes the trust level update job to run EVERY MINUTE.    #
-- # It should be followed by another migration that sets it back to daily,    #
-- # or this file should be removed/handled appropriately after testing.       #
-- #############################################################################

BEGIN;

DO $$ BEGIN
RAISE NOTICE 'Temporarily setting "daily-trust-level-updates" cron job to run every minute for testing.';
END $$;

-- First, try to unschedule any existing job with the same name
DO $$
BEGIN
    PERFORM cron.unschedule('daily-trust-level-updates');
    RAISE NOTICE 'Job "daily-trust-level-updates" unscheduled if it existed.';
EXCEPTION
    WHEN OTHERS THEN -- Catches errors, including if the job does not exist
        RAISE NOTICE 'Job "daily-trust-level-updates" did not exist or could not be unscheduled during temporary update: %', SQLERRM;
END;
$$;

-- Then, schedule the new job to run every minute
SELECT cron.schedule(
    'daily-trust-level-updates', 
    '*/1 * * * *',  -- Every minute
    $$SELECT internal.batch_update_all_user_trust_levels();$$
);

DO $$ BEGIN
RAISE NOTICE 'Job "daily-trust-level-updates" is NOW SCHEDULED TO RUN EVERY MINUTE. Remember to revert this for production!';
END $$;

COMMIT;

-- #############################################################################
-- # END OF TEMPORARY MIGRATION                                                #
-- ############################################################################# 