-- Migration: Implement internal.calculate_user_trust_score_points function

BEGIN;

-- Remove the temporary helper function if it exists from a previous test run
-- DROP FUNCTION IF EXISTS internal.get_user_connection_count(UUID);

-- Function to calculate the total trust score points for a user
CREATE OR REPLACE FUNCTION internal.calculate_user_trust_score_points(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER -- Important for accessing other internal schemas or privileged data if needed
SET search_path = internal, public -- Ensure correct function resolution
AS $$
DECLARE
    points INTEGER := 0;
    profile_record RECORD;
    connection_count INTEGER := 0;
    has_company_affiliation BOOLEAN := FALSE;
    -- Test user ID for conditional debugging
    test_user_uuid UUID := '9e26380e-5372-469c-8196-e4b676f427e5'; 
BEGIN
    IF p_user_id = test_user_uuid THEN
        RAISE NOTICE '[Debug for %] Calculating for user', test_user_uuid;
    END IF;

    SELECT * INTO profile_record FROM public.profiles WHERE id = p_user_id;

    IF NOT FOUND THEN
        IF p_user_id = test_user_uuid THEN RAISE NOTICE '[Debug for %] Profile not found', test_user_uuid; END IF;
        RETURN 0;
    END IF;

    IF p_user_id = test_user_uuid THEN RAISE NOTICE '[Debug for %] Profile found. Initial points: %', test_user_uuid, points; END IF;

    IF profile_record.status = 'active' THEN
        points := points + 5;
        IF p_user_id = test_user_uuid THEN RAISE NOTICE '[Debug for %] Active profile (+5). Points: %', test_user_uuid, points; END IF;
    ELSE
        IF p_user_id = test_user_uuid THEN RAISE NOTICE '[Debug for %] Profile not active. Status: %', test_user_uuid, profile_record.status; END IF;
        RETURN 0;
    END IF;

    IF p_user_id = test_user_uuid THEN RAISE NOTICE '[Debug for %] Checking profile completeness...', test_user_uuid; END IF;
    IF p_user_id = test_user_uuid THEN RAISE NOTICE '[Debug for %] Bio: [%], Length: %', test_user_uuid, profile_record.bio, length(profile_record.bio); END IF;
    IF profile_record.bio IS NOT NULL AND length(profile_record.bio) > 0 THEN
        points := points + 10;
        IF p_user_id = test_user_uuid THEN RAISE NOTICE '[Debug for %] Bio complete (+10). Points: %', test_user_uuid, points; END IF;
    END IF;

    IF p_user_id = test_user_uuid THEN RAISE NOTICE '[Debug for %] Headline: [%], Length: %', test_user_uuid, profile_record.professional_headline, length(profile_record.professional_headline); END IF;
    IF profile_record.professional_headline IS NOT NULL AND length(profile_record.professional_headline) > 0 THEN
        points := points + 10;
        IF p_user_id = test_user_uuid THEN RAISE NOTICE '[Debug for %] Headline complete (+10). Points: %', test_user_uuid, points; END IF;
    END IF;

    IF p_user_id = test_user_uuid THEN RAISE NOTICE '[Debug for %] Industry: [%], Length: %', test_user_uuid, profile_record.industry, length(profile_record.industry); END IF;
    IF profile_record.industry IS NOT NULL AND length(profile_record.industry) > 0 THEN
        points := points + 5;
        IF p_user_id = test_user_uuid THEN RAISE NOTICE '[Debug for %] Industry complete (+5). Points: %', test_user_uuid, points; END IF;
    END IF;

    IF p_user_id = test_user_uuid THEN RAISE NOTICE '[Debug for %] Skills: [%], Array Length: %', test_user_uuid, profile_record.skills, array_length(profile_record.skills, 1); END IF;
    IF profile_record.skills IS NOT NULL AND array_length(profile_record.skills, 1) > 0 THEN
        points := points + 10;
        IF p_user_id = test_user_uuid THEN RAISE NOTICE '[Debug for %] Skills complete (+10). Points: %', test_user_uuid, points; END IF;
    END IF;

    IF p_user_id = test_user_uuid THEN RAISE NOTICE '[Debug for %] LinkedIn: [%], Length: %', test_user_uuid, profile_record.linkedin_url, length(profile_record.linkedin_url); END IF;
    IF profile_record.linkedin_url IS NOT NULL AND length(profile_record.linkedin_url) > 0 THEN
        points := points + 10;
        IF p_user_id = test_user_uuid THEN RAISE NOTICE '[Debug for %] LinkedIn complete (+10). Points: %', test_user_uuid, points; END IF;
    END IF;

    IF p_user_id = test_user_uuid THEN RAISE NOTICE '[Debug for %] Avatar: [%], Length: %', test_user_uuid, profile_record.avatar_url, length(profile_record.avatar_url); END IF;
    IF profile_record.avatar_url IS NOT NULL AND length(profile_record.avatar_url) > 0 THEN
        points := points + 10;
        IF p_user_id = test_user_uuid THEN RAISE NOTICE '[Debug for %] Avatar complete (+10). Points: %', test_user_uuid, points; END IF;
    END IF;

    SELECT COUNT(*) INTO connection_count
    FROM public.user_connections uc
    WHERE (uc.requester_id = p_user_id OR uc.addressee_id = p_user_id) AND uc.status = 'accepted';
    IF p_user_id = test_user_uuid THEN RAISE NOTICE '[Debug for %] Connection count: %', test_user_uuid, connection_count; END IF;
    IF connection_count >= 1 THEN points := points + 10; IF p_user_id = test_user_uuid THEN RAISE NOTICE '[Debug for %] Connections >= 1 (+10). Points: %', test_user_uuid, points; END IF; END IF;
    IF connection_count >= 5 THEN points := points + 10; IF p_user_id = test_user_uuid THEN RAISE NOTICE '[Debug for %] Connections >= 5 (+10). Points: %', test_user_uuid, points; END IF; END IF;
    IF connection_count >= 10 THEN points := points + 10; IF p_user_id = test_user_uuid THEN RAISE NOTICE '[Debug for %] Connections >= 10 (+10). Points: %', test_user_uuid, points; END IF; END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.user_id = p_user_id
        -- cu.status = 'active' was removed as the column does not exist.
        -- Affiliation is determined by existing in the table.
        -- Optionally, a role check could be added here: AND cu.role IN ('OWNER', 'ADMIN', 'MEMBER')
    ) INTO has_company_affiliation;
    IF p_user_id = test_user_uuid THEN RAISE NOTICE '[Debug for %] Has company affiliation: %', test_user_uuid, has_company_affiliation; END IF;
    IF has_company_affiliation THEN
        points := points + 15;
        IF p_user_id = test_user_uuid THEN RAISE NOTICE '[Debug for %] Company affiliated (+15). Points: %', test_user_uuid, points; END IF;
    END IF;

    IF p_user_id = test_user_uuid THEN RAISE NOTICE '[Debug for %] Is Verified (profile field is_verified): %', test_user_uuid, profile_record.is_verified; END IF;
    IF profile_record.is_verified THEN
        points := points + 25; -- Assign a general verification bonus
        IF p_user_id = test_user_uuid THEN RAISE NOTICE '[Debug for %] General verification (is_verified) true (+25). Points: %', test_user_uuid, points; END IF;
    END IF;

    IF p_user_id = test_user_uuid THEN RAISE NOTICE '[Debug for %] Account Created At: %', test_user_uuid, profile_record.created_at; END IF;
    IF profile_record.created_at < (NOW() - INTERVAL '1 year') THEN
        points := points + 5;
        IF p_user_id = test_user_uuid THEN RAISE NOTICE '[Debug for %] Account > 1 year old (+5). Points: %', test_user_uuid, points; END IF;
    ELSIF profile_record.created_at < (NOW() - INTERVAL '3 months') THEN -- Changed to ELSIF for correct cumulative logic
        points := points + 2;
        IF p_user_id = test_user_uuid THEN RAISE NOTICE '[Debug for %] Account > 3 months old (+2). Points: %', test_user_uuid, points; END IF;
    END IF;
    
    IF p_user_id = test_user_uuid THEN RAISE NOTICE '[Debug for %] Is Email Verified: %', test_user_uuid, profile_record.is_email_verified; END IF;
    IF profile_record.is_email_verified THEN
        points := points + 20;
        IF p_user_id = test_user_uuid THEN RAISE NOTICE '[Debug for %] Email verified (+20). Points: %', test_user_uuid, points; END IF;
    END IF;

    IF points < 0 THEN points := 0; END IF;
    IF p_user_id = test_user_uuid THEN 
        RAISE NOTICE '[Debug for %] Final calculated points: %', test_user_uuid, points;
    END IF;
    RETURN points;
END;
$$;

COMMENT ON FUNCTION internal.calculate_user_trust_score_points(UUID) IS 'Calculates a numeric trust score. Includes targeted debug logging for user 9e26380e-5372-469c-8196-e4b676f427e5.';

COMMIT;

DO $$ BEGIN
  RAISE NOTICE 'Function internal.calculate_user_trust_score_points restored with targeted debug logging for 9e26380e-5372-469c-8196-e4b676f427e5.';
END $$; 