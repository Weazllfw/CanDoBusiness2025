-- Migration to add triggers for updating user trust levels automatically

-- Grant necessary execute permissions on the core update function
-- This function is defined in 20250612000014_create_user_trust_score_infrastructure.sql
GRANT EXECUTE ON FUNCTION internal.update_user_trust_level(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION internal.update_user_trust_level(UUID) TO service_role;

-- 1. Trigger function for changes to public.profiles
-- CREATE OR REPLACE FUNCTION internal.trigger_update_user_trust_level_for_profile()
-- RETURNS TRIGGER
-- LANGUAGE plpgsql
-- AS $$
-- BEGIN
--     -- Trigger on UPDATE of specific columns relevant to trust score
--     IF TG_OP = 'UPDATE' THEN
--         PERFORM internal.update_user_trust_level(NEW.id);
--     END IF;
--     RETURN NULL; 
-- END;
-- $$;

-- -- CREATE TRIGGER on_profile_change_update_trust_level
-- -- AFTER UPDATE OF avatar_url, bio, professional_headline, industry, skills, linkedin_url
-- -- ON public.profiles
-- -- FOR EACH ROW
-- -- EXECUTE FUNCTION internal.trigger_update_user_trust_level_for_profile();

-- -- COMMENT ON TRIGGER on_profile_change_update_trust_level ON public.profiles IS 'Updates user trust level when relevant profile fields are changed.';

-- 2. Trigger function for public.user_connections
CREATE OR REPLACE FUNCTION internal.trigger_update_user_trust_level_for_connection()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id1 UUID;
    v_user_id2 UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.status = 'ACCEPTED' THEN
            PERFORM internal.update_user_trust_level(NEW.user1_id);
            PERFORM internal.update_user_trust_level(NEW.user2_id);
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- If status changes to/from ACCEPTED
        IF (OLD.status IS DISTINCT FROM NEW.status) AND (NEW.status = 'ACCEPTED' OR OLD.status = 'ACCEPTED') THEN
            PERFORM internal.update_user_trust_level(NEW.user1_id);
            PERFORM internal.update_user_trust_level(NEW.user2_id);
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.status = 'ACCEPTED' THEN
            PERFORM internal.update_user_trust_level(OLD.user1_id);
            PERFORM internal.update_user_trust_level(OLD.user2_id);
        END IF;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER on_user_connection_change_update_trust_level
AFTER INSERT OR UPDATE OF status OR DELETE
ON public.user_connections
FOR EACH ROW
EXECUTE FUNCTION internal.trigger_update_user_trust_level_for_connection();

COMMENT ON TRIGGER on_user_connection_change_update_trust_level ON public.user_connections IS 'Updates trust levels for involved users when a connection is made, changed, or removed.';

-- 3. Trigger function for public.posts and public.post_comments (content creation/deletion)
CREATE OR REPLACE FUNCTION internal.trigger_update_user_trust_level_for_content_author()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF TG_TABLE_NAME = 'post_comments' THEN
             IF NEW.content IS NOT NULL AND NEW.content != '' THEN
                PERFORM internal.update_user_trust_level(NEW.user_id);
             END IF;
        ELSE -- for posts
            PERFORM internal.update_user_trust_level(NEW.user_id);
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
         IF TG_TABLE_NAME = 'post_comments' THEN
             IF OLD.content IS NOT NULL AND OLD.content != '' THEN
                PERFORM internal.update_user_trust_level(OLD.user_id);
             END IF;
        ELSE -- for posts
            PERFORM internal.update_user_trust_level(OLD.user_id);
        END IF;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER on_post_change_update_trust_level
AFTER INSERT OR DELETE
ON public.posts
FOR EACH ROW
EXECUTE FUNCTION internal.trigger_update_user_trust_level_for_content_author();

COMMENT ON TRIGGER on_post_change_update_trust_level ON public.posts IS 'Updates user trust level when a post is created or deleted.';

CREATE TRIGGER on_post_comment_change_update_trust_level
AFTER INSERT OR DELETE
ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION internal.trigger_update_user_trust_level_for_content_author();

COMMENT ON TRIGGER on_post_comment_change_update_trust_level ON public.post_comments IS 'Updates user trust level when a comment is created or deleted.';

-- 4. Trigger function for public.company_users (affiliation changes)
CREATE OR REPLACE FUNCTION internal.trigger_update_user_trust_level_for_company_user()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
        PERFORM internal.update_user_trust_level(COALESCE(NEW.user_id, OLD.user_id));
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER on_company_user_change_update_trust_level
AFTER INSERT OR DELETE
ON public.company_users
FOR EACH ROW
EXECUTE FUNCTION internal.trigger_update_user_trust_level_for_company_user();

COMMENT ON TRIGGER on_company_user_change_update_trust_level ON public.company_users IS 'Updates user trust level when their company affiliation changes.';

-- 5. Trigger function for public.companies (company verification status changes)
CREATE OR REPLACE FUNCTION internal.trigger_update_user_trust_level_for_company_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- May need to access company_users table broadly
SET search_path = public, internal -- Ensure correct schema context
AS $$
DECLARE
    r RECORD;
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
        -- If status changes to or from TIER1_VERIFIED (or TIER2_FULLY_VERIFIED for future consideration)
        IF (NEW.verification_status = 'TIER1_VERIFIED' OR OLD.verification_status = 'TIER1_VERIFIED') THEN 
            FOR r IN SELECT user_id FROM public.company_users WHERE company_id = NEW.id LOOP
                PERFORM internal.update_user_trust_level(r.user_id);
            END LOOP;
        END IF;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER on_company_verification_change_update_trust_levels
AFTER UPDATE OF verification_status
ON public.companies
FOR EACH ROW
EXECUTE FUNCTION internal.trigger_update_user_trust_level_for_company_verification();

COMMENT ON TRIGGER on_company_verification_change_update_trust_levels ON public.companies IS 'Updates trust levels for all users of a company when its verification status changes.'; 