-- Migration: Create initial infrastructure for User Trust Score system

BEGIN;

-- Placeholder function to eventually calculate a numeric trust score
CREATE OR REPLACE FUNCTION internal.calculate_user_trust_score_points(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- TODO: Implement actual scoring logic based on PlatformInteractionModel.md criteria:
    -- - Email verified (profiles.is_email_confirmed)
    -- - Avatar uploaded (profiles.avatar_url IS NOT NULL)
    -- - Bio / Headline filled (profiles.professional_headline IS NOT NULL OR profiles.bio IS NOT NULL)
    -- - Industry/skills selected
    -- - Connections count
    -- - LinkedIn linked (future)
    -- - Meaningful posts/comments (future, complex)
    -- - Admin of verified company
    -- - Posts upvoted/reacted to (future)
    -- - Not flagged (future)
    RETURN 0; -- Placeholder: returns a default score
END;
$$;

COMMENT ON FUNCTION internal.calculate_user_trust_score_points(UUID) IS 'Placeholder to calculate a numeric trust score for a user. Actual logic to be implemented.';

-- Function to convert score points to trust_level enum
CREATE OR REPLACE FUNCTION internal.get_trust_level_from_score(p_score INTEGER)
RETURNS public.user_trust_level_enum
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_score >= 80 THEN
        RETURN 'VERIFIED_CONTRIBUTOR';
    ELSIF p_score >= 50 THEN
        RETURN 'ESTABLISHED';
    ELSIF p_score >= 20 THEN
        RETURN 'BASIC';
    ELSE
        RETURN 'NEW';
    END IF;
END;
$$;
COMMENT ON FUNCTION internal.get_trust_level_from_score(INTEGER) IS 'Converts a numeric trust score to the corresponding user_trust_level_enum value.';


-- Main function to update a user's trust level in the profiles table
CREATE OR REPLACE FUNCTION internal.update_user_trust_level(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- May need to read various tables for scoring
SET search_path = internal, public
AS $$
DECLARE
    v_score INTEGER;
    v_new_trust_level public.user_trust_level_enum;
BEGIN
    v_score := internal.calculate_user_trust_score_points(p_user_id);
    v_new_trust_level := internal.get_trust_level_from_score(v_score);

    -- Temporarily disable triggers for this specific update -- Removed due to permission issues and problematic nature.
    -- SET session_replication_role = 'replica';

    UPDATE public.profiles
    SET trust_level = v_new_trust_level
    WHERE id = p_user_id;

    -- Re-enable triggers
    -- SET session_replication_role = 'origin';
END;
$$;

COMMENT ON FUNCTION internal.update_user_trust_level(UUID) IS 'Calculates and updates the trust_level for a given user in the profiles table.';

-- Example of how you might grant execute if it were to be called by triggers owned by 'authenticated' or other roles.
-- GRANT EXECUTE ON FUNCTION internal.update_user_trust_level(UUID) TO authenticated; -- Or specific trigger roles

DO $$ BEGIN
  RAISE NOTICE 'User Trust Score infrastructure (placeholders and helpers) created.';
END $$;

COMMIT; 