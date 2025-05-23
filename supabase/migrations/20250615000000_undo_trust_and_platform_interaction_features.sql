BEGIN;

-- 1. Unschedule and Drop Cron Job related items
DO $$ BEGIN
    RAISE NOTICE 'Attempting to unschedule daily-trust-level-updates cron job...';
    PERFORM cron.unschedule('daily-trust-level-updates');
    RAISE NOTICE 'Successfully unscheduled daily-trust-level-updates cron job (if it existed).';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not unschedule daily-trust-level-updates cron job (it might not exist or pg_cron is not accessible): %', SQLERRM;
END $$;

DO $$ BEGIN
    RAISE NOTICE 'Dropping internal.batch_update_all_user_trust_levels function...';
END $$;
DROP FUNCTION IF EXISTS internal.batch_update_all_user_trust_levels();

-- 2. Drop Triggers and their functions related to trust updates
DO $$ BEGIN
    RAISE NOTICE 'Dropping triggers and functions for trust level updates...';
END $$;
DROP TRIGGER IF EXISTS on_company_verification_change_update_trust_levels ON public.companies;
DROP FUNCTION IF EXISTS internal.trigger_update_user_trust_level_for_company_verification();
DROP TRIGGER IF EXISTS on_company_user_change_update_trust_level ON public.company_users;
DROP FUNCTION IF EXISTS internal.trigger_update_user_trust_level_for_company_user();
DROP TRIGGER IF EXISTS on_post_comment_change_update_trust_level ON public.post_comments;
DROP TRIGGER IF EXISTS on_post_change_update_trust_level ON public.posts;
DROP FUNCTION IF EXISTS internal.trigger_update_user_trust_level_for_content_author();
DROP TRIGGER IF EXISTS on_user_connection_change_update_trust_level ON public.user_connections;
DROP FUNCTION IF EXISTS internal.trigger_update_user_trust_level_for_connection();

-- 3. Drop Core Trust Score Calculation Functions
DO $$ BEGIN
    RAISE NOTICE 'Dropping core trust score calculation functions...';
END $$;
DROP FUNCTION IF EXISTS internal.update_user_trust_level(UUID);
DROP FUNCTION IF EXISTS internal.get_trust_level_from_score(INTEGER);
DROP FUNCTION IF EXISTS internal.calculate_user_trust_score_points(UUID);
DROP FUNCTION IF EXISTS internal.get_user_connection_count(UUID);

-- 4. Revert/Modify RPCs
DO $$ BEGIN
    RAISE NOTICE 'Dropping RPCs related to trust and platform interaction features...';
END $$;

DO $$ BEGIN
    RAISE NOTICE 'Dropping public.get_post_comments_threaded... (Recreate manually if an older version is needed)';
END $$;
DROP FUNCTION IF EXISTS public.get_post_comments_threaded(UUID);

DO $$ BEGIN
    RAISE NOTICE 'Dropping various versions of public.get_feed_posts... (Recreate manually if an older version is needed)';
END $$;
DROP FUNCTION IF EXISTS public.get_feed_posts(UUID, INTEGER, INTEGER, TEXT, public.user_trust_level_enum, public.post_category);
DROP FUNCTION IF EXISTS public.get_feed_posts(UUID, INTEGER, INTEGER, TEXT, public.user_trust_level_enum);
DROP FUNCTION IF EXISTS public.get_feed_posts(UUID, INTEGER, INTEGER);

DO $$ BEGIN
    RAISE NOTICE 'Dropping public.get_user_network... (Recreate manually if an older version is needed)';
END $$;
DROP FUNCTION IF EXISTS public.get_user_network(UUID);

DO $$ BEGIN
    RAISE NOTICE 'Dropping public.get_user_administered_companies...';
END $$;
DROP FUNCTION IF EXISTS public.get_user_administered_companies(UUID);

DO $$ BEGIN
    RAISE NOTICE 'Dropping various versions of public.send_message... (Recreate manually if an older version is needed)';
END $$;
DROP FUNCTION IF EXISTS public.send_message(UUID, TEXT, UUID, BOOLEAN);
DROP FUNCTION IF EXISTS public.send_message(UUID, TEXT);
DROP FUNCTION IF EXISTS public.send_message(UUID, TEXT, BOOLEAN); -- Matched p_receiver_id, p_content, p_is_system_message

DO $$ BEGIN
    RAISE NOTICE 'Dropping public.get_conversations... (Recreate manually if an older version is needed)';
END $$;
DROP FUNCTION IF EXISTS public.get_conversations();

DO $$ BEGIN
    RAISE NOTICE 'Dropping public.get_messages_for_conversation... (Recreate manually if an older version is needed)';
END $$;
DROP FUNCTION IF EXISTS public.get_messages_for_conversation(UUID, TEXT, INT, INT);

-- 5. Drop columns from public.profiles
DO $$ BEGIN
    RAISE NOTICE 'Dropping feature-specific columns from public.profiles...';
END $$;
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS bio,
DROP COLUMN IF EXISTS professional_headline,
DROP COLUMN IF EXISTS industry,
DROP COLUMN IF EXISTS skills,
DROP COLUMN IF EXISTS linkedin_url,
DROP COLUMN IF EXISTS trust_level,
DROP COLUMN IF EXISTS is_verified,
DROP COLUMN IF EXISTS is_email_verified;

-- 6. Drop trigger for is_email_verified
DO $$ BEGIN
    RAISE NOTICE 'Dropping trigger and function for is_email_verified sync...';
END $$;
DROP TRIGGER IF EXISTS trg_sync_profile_email_verification ON auth.users;
DROP FUNCTION IF EXISTS internal.sync_profile_email_verification();

-- 7. Drop ENUM type for trust level
DO $$ BEGIN
    RAISE NOTICE 'Dropping public.user_trust_level_enum type...';
END $$;
DROP TYPE IF EXISTS public.user_trust_level_enum;

-- 8. Drop columns from public.messages
DO $$ BEGIN
    RAISE NOTICE 'Dropping feature-specific columns from public.messages...';
END $$;
ALTER TABLE public.messages
DROP COLUMN IF EXISTS acting_as_company_id,
DROP COLUMN IF EXISTS target_is_company;

DO $$ BEGIN
    RAISE NOTICE 'Rollback of trust and platform interaction model features completed.';
END $$;

COMMIT; 