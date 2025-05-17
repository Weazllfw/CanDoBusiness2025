-- Migration to create RPC functions for user notifications system

BEGIN;

-- 1. RPC to get user notifications (paginated) and unread count
CREATE OR REPLACE FUNCTION public.get_user_notifications(
    p_limit INT DEFAULT 10,
    p_page_number INT DEFAULT 1 -- 1-indexed
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    title TEXT,
    message TEXT,
    link_to TEXT,
    is_read BOOLEAN,
    notification_type public.notification_type_enum,
    created_at TIMESTAMPTZ,
    unread_count BIGINT -- Total unread notifications for the user
)
LANGUAGE plpgsql
SECURITY INVOKER -- Run as the calling user
SET search_path = public
AS $$
DECLARE
    v_current_user_id UUID := auth.uid();
    v_offset INT;
    v_total_unread BIGINT;
BEGIN
    v_offset := (GREATEST(p_page_number, 1) - 1) * p_limit;

    SELECT COUNT(*) INTO v_total_unread
    FROM public.user_notifications un
    WHERE un.user_id = v_current_user_id AND un.is_read = FALSE;

    RETURN QUERY
    SELECT
        un.id,
        un.user_id,
        un.title,
        un.message,
        un.link_to,
        un.is_read,
        un.notification_type,
        un.created_at,
        v_total_unread AS unread_count
    FROM public.user_notifications un
    WHERE un.user_id = v_current_user_id
    ORDER BY un.created_at DESC
    LIMIT p_limit
    OFFSET v_offset;
END;
$$;

COMMENT ON FUNCTION public.get_user_notifications(INT, INT) IS 'Fetches paginated notifications for the current user and their total unread notification count.';
GRANT EXECUTE ON FUNCTION public.get_user_notifications(INT, INT) TO authenticated;


-- 2. RPC to mark a single notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_as_read(p_notification_id UUID)
RETURNS SETOF public.user_notifications -- Returns the updated notification row
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_current_user_id UUID := auth.uid();
BEGIN
    RETURN QUERY
    UPDATE public.user_notifications
    SET is_read = TRUE, updated_at = now()
    WHERE id = p_notification_id AND user_id = v_current_user_id
    RETURNING *;
END;
$$;

COMMENT ON FUNCTION public.mark_notification_as_read(UUID) IS 'Marks a specific notification as read for the current user.';
GRANT EXECUTE ON FUNCTION public.mark_notification_as_read(UUID) TO authenticated;


-- 3. RPC to mark all notifications as read for the current user
CREATE OR REPLACE FUNCTION public.mark_all_notifications_as_read()
RETURNS BOOLEAN -- Returns true on success
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_current_user_id UUID := auth.uid();
BEGIN
    UPDATE public.user_notifications
    SET is_read = TRUE, updated_at = now()
    WHERE user_id = v_current_user_id AND is_read = FALSE;
    
    RETURN FOUND; -- FOUND is a special variable in PL/pgSQL that is true if the preceding DML command affected at least one row.
END;
$$;

COMMENT ON FUNCTION public.mark_all_notifications_as_read() IS 'Marks all unread notifications as read for the current user.';
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_as_read() TO authenticated;

COMMIT; 