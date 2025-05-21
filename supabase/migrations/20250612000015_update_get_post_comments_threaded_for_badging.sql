-- Migration: Update get_post_comments_threaded to support company badging for commenters

DROP FUNCTION IF EXISTS public.get_post_comments_threaded(UUID);

CREATE OR REPLACE FUNCTION public.get_post_comments_threaded(p_post_id UUID)
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMPTZ,
    content TEXT,
    parent_comment_id UUID,
    user_id UUID,
    user_name TEXT,
    user_avatar_url TEXT,
    depth INT,
    sort_path TIMESTAMPTZ[],
    status public.content_status_enum,
    -- Added for commenter company badging
    commenter_verified_company_id UUID,
    commenter_verified_company_name TEXT,
    commenter_verified_company_logo_url TEXT
)
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE comment_thread AS (
        -- Anchor member: top-level comments
        SELECT
            pc.id,
            pc.created_at,
            pc.content,
            pc.parent_comment_id,
            pc.user_id,
            prof.name AS user_name,
            prof.avatar_url AS user_avatar_url,
            0 AS depth,
            ARRAY[pc.created_at] AS sort_path,
            pc.status AS status,
            -- Get verified company details if commenter is admin/owner
            (SELECT c.id FROM public.companies c JOIN public.company_users cu ON c.id = cu.company_id WHERE cu.user_id = pc.user_id AND cu.role IN ('ADMIN', 'OWNER') AND c.verification_status IN ('TIER1_VERIFIED', 'TIER2_FULLY_VERIFIED') AND c.deleted_at IS NULL ORDER BY c.name LIMIT 1) AS commenter_verified_company_id,
            (SELECT c.name FROM public.companies c JOIN public.company_users cu ON c.id = cu.company_id WHERE cu.user_id = pc.user_id AND cu.role IN ('ADMIN', 'OWNER') AND c.verification_status IN ('TIER1_VERIFIED', 'TIER2_FULLY_VERIFIED') AND c.deleted_at IS NULL ORDER BY c.name LIMIT 1) AS commenter_verified_company_name,
            (SELECT c.logo_url FROM public.companies c JOIN public.company_users cu ON c.id = cu.company_id WHERE cu.user_id = pc.user_id AND cu.role IN ('ADMIN', 'OWNER') AND c.verification_status IN ('TIER1_VERIFIED', 'TIER2_FULLY_VERIFIED') AND c.deleted_at IS NULL ORDER BY c.name LIMIT 1) AS commenter_verified_company_logo_url
        FROM
            public.post_comments pc
        JOIN
            public.profiles prof ON pc.user_id = prof.id
        WHERE
            pc.post_id = p_post_id AND pc.parent_comment_id IS NULL
            AND pc.status = 'visible'
            AND prof.status = 'active'

        UNION ALL

        -- Recursive member: replies to comments
        SELECT
            pc.id,
            pc.created_at,
            pc.content,
            pc.parent_comment_id,
            pc.user_id,
            prof.name AS user_name,
            prof.avatar_url AS user_avatar_url,
            ct.depth + 1,
            ct.sort_path || pc.created_at,
            pc.status AS status,
            -- Get verified company details if commenter is admin/owner
            (SELECT c.id FROM public.companies c JOIN public.company_users cu ON c.id = cu.company_id WHERE cu.user_id = pc.user_id AND cu.role IN ('ADMIN', 'OWNER') AND c.verification_status IN ('TIER1_VERIFIED', 'TIER2_FULLY_VERIFIED') AND c.deleted_at IS NULL ORDER BY c.name LIMIT 1) AS commenter_verified_company_id,
            (SELECT c.name FROM public.companies c JOIN public.company_users cu ON c.id = cu.company_id WHERE cu.user_id = pc.user_id AND cu.role IN ('ADMIN', 'OWNER') AND c.verification_status IN ('TIER1_VERIFIED', 'TIER2_FULLY_VERIFIED') AND c.deleted_at IS NULL ORDER BY c.name LIMIT 1) AS commenter_verified_company_name,
            (SELECT c.logo_url FROM public.companies c JOIN public.company_users cu ON c.id = cu.company_id WHERE cu.user_id = pc.user_id AND cu.role IN ('ADMIN', 'OWNER') AND c.verification_status IN ('TIER1_VERIFIED', 'TIER2_FULLY_VERIFIED') AND c.deleted_at IS NULL ORDER BY c.name LIMIT 1) AS commenter_verified_company_logo_url
        FROM
            public.post_comments pc
        JOIN
            public.profiles prof ON pc.user_id = prof.id
        JOIN
            comment_thread ct ON pc.parent_comment_id = ct.id
        WHERE 
            pc.status = 'visible'
            AND prof.status = 'active'
    )
    SELECT
        ct.id,
        ct.created_at,
        ct.content,
        ct.parent_comment_id,
        ct.user_id,
        ct.user_name,
        ct.user_avatar_url,
        ct.depth,
        ct.sort_path,
        ct.status,
        ct.commenter_verified_company_id,
        ct.commenter_verified_company_name,
        ct.commenter_verified_company_logo_url
    FROM
        comment_thread ct
    ORDER BY
        ct.sort_path;
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER;

COMMENT ON FUNCTION public.get_post_comments_threaded(UUID) IS 'Retrieves threaded comments for a post, including commenter company details for badging if they are admin/owner of a verified company.';

DO $$ BEGIN
  RAISE NOTICE 'RPC function get_post_comments_threaded updated for commenter company badging.';
END $$; 