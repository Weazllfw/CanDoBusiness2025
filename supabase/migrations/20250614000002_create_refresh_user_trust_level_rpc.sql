-- Migration: Create RPC to refresh current user's trust level

BEGIN;

-- CREATE OR REPLACE FUNCTION public.refresh_current_user_trust_level()
-- RETURNS void
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = internal, public
-- AS $$
-- DECLARE
--     v_user_id UUID := auth.uid();
--     v_score INTEGER;
--     v_new_trust_level public.user_trust_level_enum;
-- BEGIN
--     IF v_user_id IS NULL THEN
--         RAISE EXCEPTION 'User not authenticated.';
--         RETURN;
--     END IF;
-- 
--     v_score := internal.calculate_user_trust_score_points(v_user_id);
--     v_new_trust_level := internal.get_trust_level_from_score(v_score);
-- 
--     -- SET session_replication_role = 'replica'; -- Removed due to permissions issue
-- 
--     UPDATE public.profiles
--     SET trust_level = v_new_trust_level
--     WHERE id = v_user_id;
-- 
--     -- SET session_replication_role = 'origin'; -- Removed due to permissions issue
-- END;
-- $$;
-- 
-- GRANT EXECUTE ON FUNCTION public.refresh_current_user_trust_level() TO authenticated;
-- 
-- COMMENT ON FUNCTION public.refresh_current_user_trust_level() IS 'Recalculates and updates the trust_level for the currently authenticated user.';

COMMIT;

DO $$ BEGIN
  RAISE NOTICE 'RPC public.refresh_current_user_trust_level creation SKIPPED as it is problematic.';
END $$; 