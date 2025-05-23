-- Migration to implement the logic for internal.calculate_user_trust_score_points

DROP FUNCTION IF EXISTS internal.calculate_user_trust_score_points(UUID);
DROP FUNCTION IF EXISTS internal.get_user_connection_count(UUID); -- Drop helper if it exists from previous attempts

-- Helper function to specifically get connection count
CREATE OR REPLACE FUNCTION internal.get_user_connection_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_connection_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_connection_count 
    FROM public.user_connections 
    WHERE (user1_id = p_user_id OR user2_id = p_user_id) AND status = 'ACCEPTED';
    RETURN v_connection_count;
END;
$$;
COMMENT ON FUNCTION internal.get_user_connection_count(UUID) IS 'Helper to get the count of accepted connections for a user.';


CREATE OR REPLACE FUNCTION internal.calculate_user_trust_score_points(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_score INTEGER := 0;
    v_profile RECORD;
    v_user_auth RECORD;
    v_connection_count INTEGER; 
    v_content_count INTEGER;
    v_is_affiliated_tier1_verified BOOLEAN;
BEGIN
    -- Fetch user's profile
    SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
    IF NOT FOUND THEN
        RETURN 0; -- Or handle as an error
    END IF;

    -- Fetch user's auth record
    SELECT email_confirmed_at INTO v_user_auth FROM auth.users WHERE id = p_user_id;
    IF NOT FOUND THEN
        RETURN 0; -- Should not happen if profile exists, but good practice
    END IF;

    -- 1. Email verified (+20)
    IF v_user_auth.email_confirmed_at IS NOT NULL THEN
        v_score := v_score + 20;
    END IF;

    -- 2. Avatar uploaded (+10)
    IF v_profile.avatar_url IS NOT NULL AND v_profile.avatar_url != '' THEN
        v_score := v_score + 10;
    END IF;

    -- 3. Bio / Professional Headline filled in (+10)
    IF (v_profile.bio IS NOT NULL AND v_profile.bio != '') OR 
       (v_profile.professional_headline IS NOT NULL AND v_profile.professional_headline != '') THEN
        v_score := v_score + 10;
    END IF;

    -- 4. Industry or skills selected (+10)
    IF (v_profile.industry IS NOT NULL) OR 
       (v_profile.skills IS NOT NULL AND array_length(v_profile.skills, 1) > 0) THEN
        v_score := v_score + 10;
    END IF;

    -- 5. At least 3 accepted connections (+20)
    v_connection_count := internal.get_user_connection_count(p_user_id);
    IF v_connection_count >= 3 THEN
        v_score := v_score + 20;
    END IF;

    -- 6. Linked a LinkedIn profile (+20)
    IF v_profile.linkedin_url IS NOT NULL AND v_profile.linkedin_url != '' THEN
        v_score := v_score + 20;
    END IF;

    -- 7. Has posted or commented meaningfully at least 2 times (+10)
    SELECT 
        (SELECT COUNT(*) FROM public.posts WHERE user_id = p_user_id) + 
        (SELECT COUNT(*) FROM public.post_comments WHERE user_id = p_user_id AND content IS NOT NULL AND content != '') 
    INTO v_content_count;
    IF v_content_count >= 2 THEN
        v_score := v_score + 10;
    END IF;

    -- 8. Affiliated with a TIER1_VERIFIED company (+30)
    SELECT EXISTS (
        SELECT 1 
        FROM public.company_users cu
        JOIN public.companies c ON cu.company_id = c.id
        WHERE cu.user_id = p_user_id AND c.verification_status = 'TIER1_VERIFIED'
    ) INTO v_is_affiliated_tier1_verified;
    IF v_is_affiliated_tier1_verified THEN
        v_score := v_score + 30;
    END IF;

    RETURN v_score; 
END;
$$;

-- Ensure the function owner is correct for security definer or general access
-- For example, if using RLS and this function needs to bypass it for calculations:
-- ALTER FUNCTION internal.calculate_user_trust_score_points(UUID) SECURITY DEFINER;
-- GRANT EXECUTE ON FUNCTION internal.calculate_user_trust_score_points(UUID) TO supabase_admin; -- or appropriate role

COMMENT ON FUNCTION internal.calculate_user_trust_score_points(UUID) IS 'Calculates a trust score for a user based on various profile and activity metrics.'; 