-- Migration to create RPC functions for admin moderation actions.

BEGIN;

-- Ensure internal.ensure_admin() function exists (assumed from previous migrations)

-- Helper function to update flag status if a related flag ID is provided
CREATE OR REPLACE FUNCTION internal.update_related_flag_status(
    p_related_flag_id UUID,
    p_flag_table TEXT, -- 'post_flags' or 'comment_flags'
    p_new_status public.flag_status_enum,
    p_admin_user_id UUID,
    p_admin_notes TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
AS $$
BEGIN
    IF p_related_flag_id IS NOT NULL THEN
        IF p_flag_table = 'post_flags' THEN
            UPDATE public.post_flags
            SET status = p_new_status, 
                reviewed_by = p_admin_user_id, 
                reviewed_at = now(),
                updated_at = now(),
                admin_notes = COALESCE(p_admin_notes, admin_notes)
            WHERE id = p_related_flag_id;
        ELSIF p_flag_table = 'comment_flags' THEN
            UPDATE public.comment_flags
            SET status = p_new_status, 
                reviewed_by = p_admin_user_id, 
                reviewed_at = now(),
                updated_at = now(),
                admin_notes = COALESCE(p_admin_notes, admin_notes)
            WHERE id = p_related_flag_id;
        END IF;
    END IF;
END;
$$;
COMMENT ON FUNCTION internal.update_related_flag_status(UUID, TEXT, public.flag_status_enum, UUID, TEXT) 
IS 'Internal helper to update a flag status when an admin takes action related to it.';


-- 1. RPC to remove a post
CREATE OR REPLACE FUNCTION public.admin_remove_post(
    p_post_id UUID,
    p_reason TEXT,
    p_related_flag_id UUID DEFAULT NULL, -- Optional: ID of the flag that led to this action
    p_flag_table TEXT DEFAULT NULL -- 'post_flags' if p_related_flag_id is for a post flag
)
RETURNS SETOF public.posts -- Returns the updated post row
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
AS $$
DECLARE
    v_admin_user_id UUID := auth.uid();
    v_target_profile_id UUID;
    v_system_sender_id UUID;
    v_post_content_snippet TEXT;
    v_removal_message_content TEXT;
    updated_post public.posts;
BEGIN
    PERFORM ensure_admin();

    SELECT user_id, left(content, 100) INTO v_target_profile_id, v_post_content_snippet FROM public.posts WHERE id = p_post_id;

    -- Get the system admin user ID for sending messages
    SELECT id INTO v_system_sender_id FROM public.profiles WHERE email = 'rmarshall@itmarshall.net' LIMIT 1;

    INSERT INTO public.admin_actions_log (
        admin_user_id, action_type, target_profile_id, target_content_id, target_content_type, reason_notes, details
    )
    VALUES (
        v_admin_user_id, 
        'content_removed_post', 
        v_target_profile_id, 
        p_post_id, 
        'post', 
        p_reason,
        jsonb_build_object('related_flag_id', p_related_flag_id)
    );

    IF p_related_flag_id IS NOT NULL AND p_flag_table = 'post_flags' THEN
        PERFORM internal.update_related_flag_status(p_related_flag_id, p_flag_table, 'resolved_content_removed', v_admin_user_id, p_reason);
    END IF;

    UPDATE public.posts
    SET status = 'removed_by_admin', updated_at = now()
    WHERE id = p_post_id
    RETURNING * INTO updated_post;

    -- Send a message to the post author if system sender and target profile are found
    IF v_system_sender_id IS NOT NULL AND v_target_profile_id IS NOT NULL THEN
        v_removal_message_content := 'Your post (starting with: "' || v_post_content_snippet || '...") was removed by an administrator. Reason: ' || COALESCE(p_reason, '(No specific reason provided)');
        
        BEGIN
            INSERT INTO public.messages (sender_id, receiver_id, content, is_system_message)
            VALUES (v_system_sender_id, v_target_profile_id, v_removal_message_content, TRUE);
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to send post removal message to user % for post %: %', v_target_profile_id, p_post_id, SQLERRM;
        END;
    ELSIF v_system_sender_id IS NULL THEN
        RAISE WARNING 'System admin profile (rmarshall@itmarshall.net) not found. Cannot send post removal message to user for post %.', p_post_id;
    END IF;

    -- Also create a user notification for this action
    BEGIN
        INSERT INTO public.user_notifications (user_id, title, message, notification_type, link_to)
        VALUES (v_target_profile_id, 'Post Removed', v_removal_message_content, 'content_moderation', NULL);
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to create user notification for post removal (user: %, post: %): %', v_target_profile_id, p_post_id, SQLERRM;
    END;

    RETURN NEXT updated_post;
    RETURN;
END;
$$;
COMMENT ON FUNCTION public.admin_remove_post(UUID, TEXT, UUID, TEXT) IS 'Admin action: Marks a post as removed_by_admin, logs the action, and notifies the post author via message and notification.';
GRANT EXECUTE ON FUNCTION public.admin_remove_post(UUID, TEXT, UUID, TEXT) TO authenticated;


-- 2. RPC to remove a comment
CREATE OR REPLACE FUNCTION public.admin_remove_comment(
    p_comment_id UUID,
    p_reason TEXT,
    p_related_flag_id UUID DEFAULT NULL,
    p_flag_table TEXT DEFAULT NULL 
)
RETURNS SETOF public.post_comments 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
AS $$
DECLARE
    v_admin_user_id UUID := auth.uid();
    v_target_profile_id UUID;
    v_system_sender_id UUID;
    v_comment_content_snippet TEXT;
    v_removal_message_content TEXT;
    updated_comment public.post_comments;
BEGIN
    PERFORM ensure_admin();

    SELECT pc.user_id, left(pc.content, 100) 
    INTO v_target_profile_id, v_comment_content_snippet 
    FROM public.post_comments pc WHERE pc.id = p_comment_id;

    SELECT id INTO v_system_sender_id FROM public.profiles WHERE email = 'rmarshall@itmarshall.net' LIMIT 1;

    INSERT INTO public.admin_actions_log (
        admin_user_id, action_type, target_profile_id, target_content_id, target_content_type, reason_notes, details
    )
    VALUES (
        v_admin_user_id, 
        'content_removed_comment', 
        v_target_profile_id, 
        p_comment_id, 
        'comment', 
        p_reason,
        jsonb_build_object('related_flag_id', p_related_flag_id)
    );

    IF p_related_flag_id IS NOT NULL AND p_flag_table = 'comment_flags' THEN
        PERFORM internal.update_related_flag_status(p_related_flag_id, p_flag_table, 'resolved_content_removed', v_admin_user_id, p_reason);
    END IF;

    UPDATE public.post_comments
    SET status = 'removed_by_admin', updated_at = now()
    WHERE id = p_comment_id
    RETURNING * INTO updated_comment;

    IF v_system_sender_id IS NOT NULL AND v_target_profile_id IS NOT NULL THEN
        v_removal_message_content := 'Your comment (starting with: "' || v_comment_content_snippet || '...") was removed by an administrator. Reason: ' || COALESCE(p_reason, '(No specific reason provided)');
        
        BEGIN
            INSERT INTO public.messages (sender_id, receiver_id, content, is_system_message)
            VALUES (v_system_sender_id, v_target_profile_id, v_removal_message_content, TRUE);
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to send comment removal message to user % for comment %: %', v_target_profile_id, p_comment_id, SQLERRM;
        END;
    ELSIF v_system_sender_id IS NULL THEN
        RAISE WARNING 'System admin profile (rmarshall@itmarshall.net) not found. Cannot send comment removal message for comment %.', p_comment_id;
    END IF;

    BEGIN
        INSERT INTO public.user_notifications (user_id, title, message, notification_type, link_to)
        VALUES (v_target_profile_id, 'Comment Removed', v_removal_message_content, 'content_moderation', NULL);
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to create user notification for comment removal (user: %, comment: %): %', v_target_profile_id, p_comment_id, SQLERRM;
    END;

    RETURN NEXT updated_comment;
    RETURN;
END;
$$;
COMMENT ON FUNCTION public.admin_remove_comment(UUID, TEXT, UUID, TEXT) IS 'Admin action: Marks a comment as removed_by_admin, logs the action, and notifies the comment author via message and notification.';
GRANT EXECUTE ON FUNCTION public.admin_remove_comment(UUID, TEXT, UUID, TEXT) TO authenticated;


-- 3. RPC to warn a user
CREATE OR REPLACE FUNCTION public.admin_warn_user(
    p_target_profile_id UUID,
    p_reason TEXT,
    p_related_content_id UUID DEFAULT NULL,
    p_related_content_type public.admin_action_target_type_enum DEFAULT NULL,
    p_related_flag_id UUID DEFAULT NULL,
    p_flag_table TEXT DEFAULT NULL
)
RETURNS SETOF public.profiles 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
AS $$
DECLARE
    v_admin_user_id UUID := auth.uid();
    v_system_sender_id UUID;
    v_warning_message_content TEXT;
BEGIN
    PERFORM ensure_admin();

    SELECT id INTO v_system_sender_id FROM public.profiles WHERE email = 'rmarshall@itmarshall.net' LIMIT 1;

    IF v_system_sender_id IS NULL THEN
        RAISE WARNING 'System admin profile (rmarshall@itmarshall.net) not found. Cannot send warning message to user.';
    END IF;

    INSERT INTO public.admin_actions_log (
        admin_user_id, action_type, target_profile_id, target_content_id, target_content_type, reason_notes, details
    )
    VALUES (
        v_admin_user_id, 
        'user_warned', 
        p_target_profile_id, 
        p_related_content_id, 
        p_related_content_type, 
        p_reason,
        jsonb_build_object('related_flag_id', p_related_flag_id)
    );

    IF p_related_flag_id IS NOT NULL AND p_flag_table IS NOT NULL THEN
        PERFORM internal.update_related_flag_status(p_related_flag_id, p_flag_table, 'resolved_user_warned', v_admin_user_id, p_reason);
    END IF;

    IF v_system_sender_id IS NOT NULL AND p_target_profile_id IS NOT NULL THEN
        v_warning_message_content := 'You have received an official warning regarding your activity on the platform. Reason: ' || COALESCE(p_reason, '(No specific reason provided by admin)');
        
        IF p_related_content_type IS NOT NULL AND p_related_content_id IS NOT NULL THEN
             v_warning_message_content := v_warning_message_content || '. This warning is related to content of type: ' || p_related_content_type::text || ' (ID: ' || p_related_content_id::text || ')';
        END IF;

        BEGIN
            INSERT INTO public.messages (sender_id, receiver_id, content, is_system_message)
            VALUES (v_system_sender_id, p_target_profile_id, v_warning_message_content, TRUE);
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to send warning message to user %: %', p_target_profile_id, SQLERRM;
        END;
    END IF;

    BEGIN
        INSERT INTO public.user_notifications (user_id, title, message, notification_type, link_to)
        VALUES (p_target_profile_id, 'Account Warning', v_warning_message_content, 'content_moderation', NULL);
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to create user notification for account warning (user: %): %', p_target_profile_id, SQLERRM;
    END;

    -- Update last_warning_at for the profile
    UPDATE public.profiles
    SET last_warning_at = now(), status = 'warned' -- Optionally set profile status to warned
    WHERE id = p_target_profile_id;

    -- Return the updated profile row
    RETURN QUERY SELECT * FROM public.profiles WHERE id = p_target_profile_id;
END;
$$;
COMMENT ON FUNCTION public.admin_warn_user(UUID, TEXT, UUID, public.admin_action_target_type_enum, UUID, TEXT) IS 'Admin action: Warns a user, logs action, sends message & notification, updates profile last_warning_at.';
GRANT EXECUTE ON FUNCTION public.admin_warn_user(UUID, TEXT, UUID, public.admin_action_target_type_enum, UUID, TEXT) TO authenticated;


-- 4. RPC to ban a user
CREATE OR REPLACE FUNCTION public.admin_ban_user(
    p_target_profile_id UUID,
    p_reason TEXT,
    p_duration_days INT DEFAULT NULL, 
    p_related_content_id UUID DEFAULT NULL,
    p_related_content_type public.admin_action_target_type_enum DEFAULT NULL,
    p_related_flag_id UUID DEFAULT NULL,
    p_flag_table TEXT DEFAULT NULL
)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
AS $$
DECLARE
    v_admin_user_id UUID := auth.uid();
    v_system_sender_id UUID;
    v_ban_message_content TEXT;
    v_profile_status public.profile_status_enum;
    v_ban_expires_at TIMESTAMPTZ DEFAULT NULL;
BEGIN
    PERFORM ensure_admin();

    SELECT id INTO v_system_sender_id FROM public.profiles WHERE email = 'rmarshall@itmarshall.net' LIMIT 1;

    IF p_duration_days IS NOT NULL AND p_duration_days > 0 THEN
        v_profile_status := 'banned_temporarily';
        v_ban_expires_at := now() + (p_duration_days * INTERVAL '1 day');
        v_ban_message_content := 'Your account has been temporarily banned. Reason: ' || COALESCE(p_reason, '(No reason provided)') || '. Your ban will expire on ' || to_char(v_ban_expires_at, 'YYYY-MM-DD HH24:MI:SS TZ') || '.';
    ELSE
        v_profile_status := 'banned_permanently';
        v_ban_message_content := 'Your account has been permanently banned. Reason: ' || COALESCE(p_reason, '(No reason provided)') || '.';
    END IF;

    INSERT INTO public.admin_actions_log (
        admin_user_id, action_type, target_profile_id, target_content_id, target_content_type, reason_notes, details
    )
    VALUES (
        v_admin_user_id, 
        CASE 
            WHEN v_profile_status = 'banned_temporarily' THEN 'user_banned_temporarily'::public.admin_action_type_enum 
            ELSE 'user_banned_permanently'::public.admin_action_type_enum 
        END,
        p_target_profile_id, 
        p_related_content_id, 
        p_related_content_type, 
        p_reason,
        jsonb_build_object(
            'related_flag_id', p_related_flag_id,
            'duration_days', p_duration_days
        )
    );

    IF p_related_flag_id IS NOT NULL AND p_flag_table IS NOT NULL THEN
        PERFORM internal.update_related_flag_status(p_related_flag_id, p_flag_table, 'resolved_user_banned', v_admin_user_id, p_reason);
    END IF;

    UPDATE public.profiles
    SET status = v_profile_status, ban_expires_at = v_ban_expires_at, updated_at = now()
    WHERE id = p_target_profile_id;

    IF v_system_sender_id IS NOT NULL AND p_target_profile_id IS NOT NULL THEN
        BEGIN
            INSERT INTO public.messages (sender_id, receiver_id, content, is_system_message)
            VALUES (v_system_sender_id, p_target_profile_id, v_ban_message_content, TRUE);
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to send ban message to user %: %', p_target_profile_id, SQLERRM;
        END;
    ELSIF v_system_sender_id IS NULL THEN
        RAISE WARNING 'System admin profile (rmarshall@itmarshall.net) not found. Cannot send ban message to user %.', p_target_profile_id;
    END IF;

    BEGIN
        INSERT INTO public.user_notifications (user_id, title, message, notification_type, link_to)
        VALUES (p_target_profile_id, 
                CASE WHEN v_profile_status = 'banned_temporarily' THEN 'Account Temporarily Banned' ELSE 'Account Permanently Banned' END, 
                v_ban_message_content, 
                'content_moderation', 
                NULL);
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to create user notification for ban (user: %): %', p_target_profile_id, SQLERRM;
    END;

    RETURN QUERY SELECT * FROM public.profiles WHERE id = p_target_profile_id;
END;
$$;
COMMENT ON FUNCTION public.admin_ban_user(UUID, TEXT, INT, UUID, public.admin_action_target_type_enum, UUID, TEXT) IS 'Admin action: Bans a user (temporarily or permanently), logs action, sends message & notification, updates profile status.';
GRANT EXECUTE ON FUNCTION public.admin_ban_user(UUID, TEXT, INT, UUID, public.admin_action_target_type_enum, UUID, TEXT) TO authenticated;

COMMIT; 