-- Migration: update_get_followed_companies_with_privacy
-- Description: Updates public.get_followed_companies to respect the are_followed_companies_public privacy flag in profiles and to return company details.

DROP FUNCTION IF EXISTS public.get_followed_companies(UUID);
-- Original from 20250610000000_create_user_company_follows.sql returned SETOF public.user_company_follows
-- This version changes the return type to include company details and respects privacy.
CREATE OR REPLACE FUNCTION public.get_followed_companies(p_user_id UUID)
RETURNS TABLE (
    follow_id UUID,
    company_id UUID,
    company_name TEXT,
    company_avatar_url TEXT,
    company_industry TEXT,
    company_verification_status TEXT,
    followed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, internal
AS $$
DECLARE
    v_are_follows_public BOOLEAN;
    v_caller_is_target BOOLEAN;
    v_caller_is_admin BOOLEAN;
BEGIN
    SELECT profiles.are_followed_companies_public INTO v_are_follows_public 
    FROM public.profiles WHERE id = p_user_id;

    IF NOT FOUND THEN -- Target profile does not exist
        RETURN; 
    END IF;

    v_caller_is_target := auth.uid() = p_user_id;
    v_caller_is_admin := internal.is_admin(auth.uid());

    IF v_are_follows_public OR v_caller_is_target OR v_caller_is_admin THEN
        RETURN QUERY
        SELECT
            ucf.id as follow_id,
            ucf.company_id,
            c.name as company_name,
            c.avatar_url as company_avatar_url,
            c.industry as company_industry,
            c.verification_status as company_verification_status,
            ucf.created_at as followed_at
        FROM public.user_company_follows ucf
        JOIN public.companies c ON ucf.company_id = c.id
        WHERE ucf.user_id = p_user_id
          AND c.deleted_at IS NULL -- Ensure company is not deleted
        ORDER BY ucf.created_at DESC;
    ELSE
        -- If followed companies list is private and caller is not owner or admin, return empty set.
        RETURN;
    END IF;
END;
$$;

COMMENT ON FUNCTION public.get_followed_companies(UUID) 
IS 'Returns companies followed by p_user_id, including company details, respecting the are_followed_companies_public privacy flag. Admins and profile owners can always view.';

DO $$ BEGIN
  RAISE NOTICE 'Function public.get_followed_companies updated to respect privacy and return company details.';
END $$; 