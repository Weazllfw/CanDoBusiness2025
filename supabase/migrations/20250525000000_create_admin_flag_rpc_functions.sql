-- Migration to create RPC functions for admin management of content flags.

-- Ensure internal.ensure_admin() function exists (assumed from previous migrations)

-- 1. RPC Function to get aggregated flag statistics
CREATE OR REPLACE FUNCTION public.admin_get_flag_statistics()
RETURNS TABLE(
    status public.flag_status_enum,
    post_flag_count BIGINT,
    comment_flag_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
AS $$
BEGIN
    -- Ensure the caller is an admin
    PERFORM ensure_admin();

    RETURN QUERY
    SELECT s.status_val, pf.count, cf.count
    FROM unnest(enum_range(NULL::public.flag_status_enum)) s(status_val)
    LEFT JOIN (
        SELECT post_flags.status, count(*) AS count FROM public.post_flags GROUP BY post_flags.status
    ) pf ON pf.status = s.status_val
    LEFT JOIN (
        SELECT comment_flags.status, count(*) AS count FROM public.comment_flags GROUP BY comment_flags.status
    ) cf ON cf.status = s.status_val;
END;
$$;

COMMENT ON FUNCTION public.admin_get_flag_statistics() IS 'Admin RPC to get counts of post and comment flags, grouped by status. Requires admin privileges.';

-- Grant execute to authenticated (RLS with ensure_admin() will handle actual permission)
GRANT EXECUTE ON FUNCTION public.admin_get_flag_statistics() TO authenticated;


-- 2. RPC Function to get paginated post flags
CREATE OR REPLACE FUNCTION public.admin_get_post_flags(
    p_status public.flag_status_enum DEFAULT NULL,
    p_page_number INT DEFAULT 1,
    p_page_size INT DEFAULT 10
)
RETURNS TABLE (
    flag_id UUID,
    post_id UUID,
    post_content TEXT,
    post_media_url TEXT,
    post_media_type TEXT,
    post_author_id UUID,
    post_author_username TEXT, -- Assuming you have a way to join with profiles or a username on posts
    flagger_user_id UUID,
    flagger_username TEXT, -- Assuming you have a way to join with profiles
    reason TEXT,
    status public.flag_status_enum,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    admin_notes TEXT,
    total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
AS $$
DECLARE
    v_offset INT;
    v_total_records BIGINT;
BEGIN
    PERFORM ensure_admin();
    v_offset := (p_page_number - 1) * p_page_size;

    SELECT count(*) INTO v_total_records
    FROM public.post_flags pf
    WHERE (p_status IS NULL OR pf.status = p_status);

    RETURN QUERY
    SELECT
        pf.id as flag_id,
        pf.post_id,
        p.content as post_content,
        p.media_url as post_media_url,
        p.media_type as post_media_type,
        p.user_id as post_author_id,
        COALESCE(author_profile.name, 'Unknown') as post_author_username,
        pf.user_id as flagger_user_id,
        COALESCE(flagger_profile.name, 'Unknown') as flagger_username,
        pf.reason,
        pf.status,
        pf.created_at,
        pf.updated_at,
        pf.admin_notes,
        v_total_records AS total_count
    FROM public.post_flags pf
    JOIN public.posts p ON pf.post_id = p.id
    LEFT JOIN public.profiles author_profile ON p.user_id = author_profile.id
    LEFT JOIN public.profiles flagger_profile ON pf.user_id = flagger_profile.id
    WHERE (p_status IS NULL OR pf.status = p_status)
    ORDER BY pf.created_at DESC
    LIMIT p_page_size
    OFFSET v_offset;
END;
$$;

COMMENT ON FUNCTION public.admin_get_post_flags(public.flag_status_enum, INT, INT) IS 'Admin RPC to get paginated post flags, optionally filtered by status. Requires admin privileges.';
GRANT EXECUTE ON FUNCTION public.admin_get_post_flags(public.flag_status_enum, INT, INT) TO authenticated;


-- 3. RPC Function to update post flag status
CREATE OR REPLACE FUNCTION public.admin_update_post_flag_status(
    p_flag_id UUID,
    p_new_status public.flag_status_enum,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS SETOF public.post_flags -- Returns the updated row
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
AS $$
BEGIN
    PERFORM ensure_admin();

    RETURN QUERY
    UPDATE public.post_flags
    SET
        status = p_new_status,
        admin_notes = COALESCE(p_admin_notes, admin_notes), -- Keep existing notes if new ones are null
        reviewed_by = auth.uid(), -- Set the reviewer
        reviewed_at = now(),      -- Set the review time
        updated_at = now()
    WHERE id = p_flag_id
    RETURNING *;
END;
$$;

COMMENT ON FUNCTION public.admin_update_post_flag_status(UUID, public.flag_status_enum, TEXT) IS 'Admin RPC to update the status and notes of a specific post flag. Requires admin privileges.';
GRANT EXECUTE ON FUNCTION public.admin_update_post_flag_status(UUID, public.flag_status_enum, TEXT) TO authenticated;


-- 4. RPC Function to get paginated comment flags
CREATE OR REPLACE FUNCTION public.admin_get_comment_flags(
    p_status public.flag_status_enum DEFAULT NULL,
    p_page_number INT DEFAULT 1,
    p_page_size INT DEFAULT 10
)
RETURNS TABLE (
    flag_id UUID,
    comment_id UUID,
    comment_content TEXT,
    comment_author_id UUID,
    comment_author_username TEXT,
    flagger_user_id UUID,
    flagger_username TEXT,
    reason TEXT,
    status public.flag_status_enum,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    admin_notes TEXT,
    total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
AS $$
DECLARE
    v_offset INT;
    v_total_records BIGINT;
BEGIN
    PERFORM ensure_admin();
    v_offset := (p_page_number - 1) * p_page_size;

    SELECT count(*) INTO v_total_records
    FROM public.comment_flags cf
    WHERE (p_status IS NULL OR cf.status = p_status);

    RETURN QUERY
    SELECT
        cf.id as flag_id,
        cf.comment_id,
        c.content as comment_content,
        c.user_id as comment_author_id,
        COALESCE(author_profile.name, 'Unknown') as comment_author_username,
        cf.user_id as flagger_user_id,
        COALESCE(flagger_profile.name, 'Unknown') as flagger_username,
        cf.reason,
        cf.status,
        cf.created_at,
        cf.updated_at,
        cf.admin_notes,
        v_total_records AS total_count
    FROM public.comment_flags cf
    JOIN public.post_comments c ON cf.comment_id = c.id
    LEFT JOIN public.profiles author_profile ON c.user_id = author_profile.id
    LEFT JOIN public.profiles flagger_profile ON cf.user_id = flagger_profile.id
    WHERE (p_status IS NULL OR cf.status = p_status)
    ORDER BY cf.created_at DESC
    LIMIT p_page_size
    OFFSET v_offset;
END;
$$;

COMMENT ON FUNCTION public.admin_get_comment_flags(public.flag_status_enum, INT, INT) IS 'Admin RPC to get paginated comment flags, optionally filtered by status. Requires admin privileges.';
GRANT EXECUTE ON FUNCTION public.admin_get_comment_flags(public.flag_status_enum, INT, INT) TO authenticated;


-- 5. RPC Function to update comment flag status
CREATE OR REPLACE FUNCTION public.admin_update_comment_flag_status(
    p_flag_id UUID,
    p_new_status public.flag_status_enum,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS SETOF public.comment_flags -- Returns the updated row
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
AS $$
BEGIN
    PERFORM ensure_admin();

    RETURN QUERY
    UPDATE public.comment_flags
    SET
        status = p_new_status,
        admin_notes = COALESCE(p_admin_notes, admin_notes),
        reviewed_by = auth.uid(), -- Set the reviewer
        reviewed_at = now(),      -- Set the review time
        updated_at = now()
    WHERE id = p_flag_id
    RETURNING *;
END;
$$;

COMMENT ON FUNCTION public.admin_update_comment_flag_status(UUID, public.flag_status_enum, TEXT) IS 'Admin RPC to update the status and notes of a specific comment flag. Requires admin privileges.';
GRANT EXECUTE ON FUNCTION public.admin_update_comment_flag_status(UUID, public.flag_status_enum, TEXT) TO authenticated;


-- Placeholder for other admin flag RPCs to be added in this file:
-- admin_get_comment_flags(p_status flag_status_enum, p_page_number INT, p_page_size INT)
-- admin_update_comment_flag_status(p_flag_id UUID, p_new_status flag_status_enum, p_admin_notes TEXT) 