-- Migration: update_rpcs_to_use_app_config_admin_email
-- Description: Updates RPCs that use a hardcoded admin email to use internal.get_app_config('admin_email').

-- 1. Update public.admin_update_company_verification

-- Re-define the function for admins to update company verification status and notes,
-- now using internal.get_app_config('admin_email') for the system user's email.
CREATE OR REPLACE FUNCTION public.admin_update_company_verification(
  p_company_id UUID,
  p_new_status VARCHAR(20),
  p_new_admin_notes TEXT
)
RETURNS public.companies -- Returns the updated company row
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal, storage
AS $$
DECLARE
  updated_company public.companies%ROWTYPE;
  company_to_update public.companies%ROWTYPE;
  system_user_id uuid;
  company_owner_id uuid;
  admin_profile_email TEXT;
  message_content TEXT;
  status_display_name TEXT;
  v_tier2_doc_path TEXT;
  v_deleted_count INTEGER;
BEGIN
  IF NOT internal.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'User is not authorized to perform this action.';
  END IF;

  -- Fetch the admin email from app_config
  admin_profile_email := internal.get_app_config('admin_email');
  IF admin_profile_email IS NULL THEN
    RAISE WARNING 'Admin Notification: admin_email not found in internal.app_config. Verification update will proceed, but notification message may not be sent correctly.';
    -- Proceeding with NULL admin_profile_email, which will likely cause system_user_id lookup to fail silently or be NULL.
  END IF;

  -- Fetch the current company details
  SELECT * INTO company_to_update FROM public.companies WHERE id = p_company_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Company with ID % not found when fetching for update.', p_company_id;
  END IF;

  -- Look up the system user ID for messaging.
  IF admin_profile_email IS NOT NULL THEN
    SELECT id INTO system_user_id FROM public.profiles WHERE email = admin_profile_email LIMIT 1;
    IF system_user_id IS NULL THEN
      RAISE WARNING 'Admin Notification: System user profile for email [%] (from app_config) not found. Verification update will proceed, but notification message will not be sent.', admin_profile_email;
    END IF;
  ELSE
    RAISE WARNING 'Admin Notification: Admin email is NULL (from app_config). Cannot look up system user for notifications.';
  END IF;
  
  -- Update company status and admin notes
  UPDATE public.companies
  SET
    verification_status = p_new_status,
    admin_notes = p_new_admin_notes
  WHERE id = p_company_id
  RETURNING * INTO updated_company;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Company with ID % not found during update.', p_company_id;
  END IF;

  IF (p_new_status = 'TIER2_FULLY_VERIFIED' OR p_new_status = 'TIER2_REJECTED') AND company_to_update.tier2_document_storage_path IS NOT NULL THEN
    v_tier2_doc_path := company_to_update.tier2_document_storage_path;
    RAISE NOTICE 'Tier 2 finalized for company ID %. Attempting to delete document at path: % from bucket tier2-verification-documents', p_company_id, v_tier2_doc_path;
    BEGIN
      SELECT count(*) INTO v_deleted_count FROM storage.delete_object('tier2-verification-documents', v_tier2_doc_path);
      RAISE NOTICE 'Storage deletion attempt for %: % objects removed.', v_tier2_doc_path, v_deleted_count;
      UPDATE public.companies
      SET tier2_document_type = NULL, tier2_document_filename = NULL, tier2_document_storage_path = NULL, tier2_document_uploaded_at = NULL
      WHERE id = p_company_id;
      RAISE NOTICE 'Tier 2 document fields cleared for company ID %.', p_company_id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Admin Notification: Failed to delete Tier 2 document at path [%] or clear fields for company ID %. SQLSTATE: %, SQLERRM: %. Manual cleanup may be required.', v_tier2_doc_path, p_company_id, SQLSTATE, SQLERRM;
    END;
  END IF;

  IF system_user_id IS NOT NULL AND updated_company.owner_id IS NOT NULL THEN
    company_owner_id := updated_company.owner_id;
    IF system_user_id = company_owner_id THEN
      RAISE NOTICE 'Admin Notification: Company owner is the system user. No notification message sent to self for company ID %.', p_company_id;
    ELSE
      status_display_name := CASE p_new_status
        WHEN 'UNVERIFIED' THEN 'Unverified'
        WHEN 'TIER1_PENDING' THEN 'Tier 1 Pending Review'
        WHEN 'TIER1_VERIFIED' THEN 'Tier 1 Verified'
        WHEN 'TIER1_REJECTED' THEN 'Tier 1 Application Rejected'
        WHEN 'TIER2_PENDING' THEN 'Tier 2 Pending Review'
        WHEN 'TIER2_FULLY_VERIFIED' THEN 'Tier 2 Fully Verified'
        WHEN 'TIER2_REJECTED' THEN 'Tier 2 Application Rejected'
        ELSE p_new_status
      END;
      message_content := 'Your company, ' || updated_company.name || ', has had its verification status updated to: ' || status_display_name || '.';
      IF p_new_admin_notes IS NOT NULL AND trim(p_new_admin_notes) <> '' THEN
        message_content := message_content || ' Admin notes: ' || p_new_admin_notes;
      END IF;
      BEGIN
        INSERT INTO public.messages (sender_id, receiver_id, content, is_system_message)
        VALUES (system_user_id, company_owner_id, message_content, TRUE);
        RAISE NOTICE 'Admin Notification: Message sent to user % regarding company % status change to %', company_owner_id, updated_company.name, p_new_status;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'Admin Notification: Failed to send message to user % for company %. SQLSTATE: %, SQLERRM: %', company_owner_id, p_company_id, SQLSTATE, SQLERRM;
      END;
    END IF;
  END IF;

  RETURN updated_company;
END;
$$;

COMMENT ON FUNCTION public.admin_update_company_verification(UUID, VARCHAR(20), TEXT) IS 'Admin RPC to update company verification status. Sends notification using admin_email from app_config.';

-- 2. Update public.admin_remove_post
CREATE OR REPLACE FUNCTION public.admin_remove_post(
    p_post_id UUID,
    p_reason TEXT,
    p_related_flag_id UUID DEFAULT NULL,
    p_flag_table TEXT DEFAULT NULL
)
RETURNS SETOF public.posts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
AS $$
DECLARE
    v_admin_user_id UUID := auth.uid();
    v_target_profile_id UUID;
    v_system_sender_id UUID;
    admin_profile_email TEXT;
    v_post_content_snippet TEXT;
    v_removal_message_content TEXT;
    updated_post public.posts;
BEGIN
    PERFORM ensure_admin();

    -- Fetch the admin email from app_config
    admin_profile_email := internal.get_app_config('admin_email');
    IF admin_profile_email IS NULL THEN
        RAISE WARNING 'System admin email not found in app_config. Cannot send notification messages.';
    ELSE
        SELECT id INTO v_system_sender_id FROM public.profiles WHERE email = admin_profile_email LIMIT 1;
        IF v_system_sender_id IS NULL THEN
            RAISE WARNING 'System admin profile for email [%] (from app_config) not found. Cannot send notification messages.', admin_profile_email;
        END IF;
    END IF;

    SELECT user_id, left(content, 100) INTO v_target_profile_id, v_post_content_snippet FROM public.posts WHERE id = p_post_id;

    INSERT INTO public.admin_actions_log (admin_user_id, action_type, target_profile_id, target_content_id, target_content_type, reason_notes, details)
    VALUES (v_admin_user_id, 'content_removed_post', v_target_profile_id, p_post_id, 'post', p_reason, jsonb_build_object('related_flag_id', p_related_flag_id));

    IF p_related_flag_id IS NOT NULL AND p_flag_table = 'post_flags' THEN
        PERFORM internal.update_related_flag_status(p_related_flag_id, p_flag_table, 'resolved_content_removed', v_admin_user_id, p_reason);
    END IF;

    UPDATE public.posts SET status = 'removed_by_admin', updated_at = now() WHERE id = p_post_id RETURNING * INTO updated_post;

    IF v_system_sender_id IS NOT NULL AND v_target_profile_id IS NOT NULL THEN
        v_removal_message_content := 'Your post (starting with: "' || v_post_content_snippet || '...") was removed by an administrator. Reason: ' || COALESCE(p_reason, '(No specific reason provided)');
        BEGIN
            INSERT INTO public.messages (sender_id, receiver_id, content, is_system_message) VALUES (v_system_sender_id, v_target_profile_id, v_removal_message_content, TRUE);
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to send post removal message to user % for post %: %', v_target_profile_id, p_post_id, SQLERRM;
        END;
        BEGIN
            INSERT INTO public.user_notifications (user_id, title, message, notification_type, link_to)
            VALUES (v_target_profile_id, 'Post Removed', v_removal_message_content, 'content_moderation', NULL);
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to create user notification for post removal (user: %, post: %): %', v_target_profile_id, p_post_id, SQLERRM;
        END;
    ELSIF v_system_sender_id IS NULL THEN
        RAISE WARNING 'System admin profile ID could not be determined (admin_email: [%]). Cannot send post removal notifications for post %.', admin_profile_email, p_post_id;
    END IF;

    RETURN NEXT updated_post; RETURN;
END;
$$;
COMMENT ON FUNCTION public.admin_remove_post(UUID, TEXT, UUID, TEXT) IS 'Admin action: Marks a post as removed_by_admin, logs, and notifies author. Uses configured admin_email.';

-- 3. Update public.admin_remove_comment
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
    admin_profile_email TEXT;
    v_comment_content_snippet TEXT;
    v_removal_message_content TEXT;
    updated_comment public.post_comments;
BEGIN
    PERFORM ensure_admin();

    admin_profile_email := internal.get_app_config('admin_email');
    IF admin_profile_email IS NULL THEN
        RAISE WARNING 'System admin email not found in app_config. Cannot send notification messages.';
    ELSE
        SELECT id INTO v_system_sender_id FROM public.profiles WHERE email = admin_profile_email LIMIT 1;
        IF v_system_sender_id IS NULL THEN
            RAISE WARNING 'System admin profile for email [%] (from app_config) not found. Cannot send notification messages.', admin_profile_email;
        END IF;
    END IF;

    SELECT pc.user_id, left(pc.content, 100) INTO v_target_profile_id, v_comment_content_snippet FROM public.post_comments pc WHERE pc.id = p_comment_id;

    INSERT INTO public.admin_actions_log (admin_user_id, action_type, target_profile_id, target_content_id, target_content_type, reason_notes, details)
    VALUES (v_admin_user_id, 'content_removed_comment', v_target_profile_id, p_comment_id, 'comment', p_reason, jsonb_build_object('related_flag_id', p_related_flag_id));

    IF p_related_flag_id IS NOT NULL AND p_flag_table = 'comment_flags' THEN
        PERFORM internal.update_related_flag_status(p_related_flag_id, p_flag_table, 'resolved_content_removed', v_admin_user_id, p_reason);
    END IF;

    UPDATE public.post_comments SET status = 'removed_by_admin', updated_at = now() WHERE id = p_comment_id RETURNING * INTO updated_comment;

    IF v_system_sender_id IS NOT NULL AND v_target_profile_id IS NOT NULL THEN
        v_removal_message_content := 'Your comment (starting with: "' || v_comment_content_snippet || '...") was removed by an administrator. Reason: ' || COALESCE(p_reason, '(No specific reason provided)');
        BEGIN
            INSERT INTO public.messages (sender_id, receiver_id, content, is_system_message) VALUES (v_system_sender_id, v_target_profile_id, v_removal_message_content, TRUE);
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to send comment removal message to user % for comment %: %', v_target_profile_id, p_comment_id, SQLERRM;
        END;
        BEGIN
            INSERT INTO public.user_notifications (user_id, title, message, notification_type, link_to)
            VALUES (v_target_profile_id, 'Comment Removed', v_removal_message_content, 'content_moderation', NULL);
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to create user notification for comment removal (user: %, comment: %): %', v_target_profile_id, p_comment_id, SQLERRM;
        END;
    ELSIF v_system_sender_id IS NULL THEN
        RAISE WARNING 'System admin profile ID could not be determined (admin_email: [%]). Cannot send comment removal notifications for comment %.', admin_profile_email, p_comment_id;
    END IF;

    RETURN NEXT updated_comment; RETURN;
END;
$$;
COMMENT ON FUNCTION public.admin_remove_comment(UUID, TEXT, UUID, TEXT) IS 'Admin action: Marks a comment as removed_by_admin, logs, and notifies author. Uses configured admin_email.';

-- 4. Update public.admin_warn_user
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
    admin_profile_email TEXT;
    v_warning_message_content TEXT;
    updated_profile public.profiles;
BEGIN
    PERFORM ensure_admin();

    admin_profile_email := internal.get_app_config('admin_email');
    IF admin_profile_email IS NULL THEN
        RAISE WARNING 'System admin email not found in app_config. Cannot send warning message.';
    ELSE
        SELECT id INTO v_system_sender_id FROM public.profiles WHERE email = admin_profile_email LIMIT 1;
        IF v_system_sender_id IS NULL THEN
            RAISE WARNING 'System admin profile for email [%] (from app_config) not found. Cannot send warning message.', admin_profile_email;
        END IF;
    END IF;

    INSERT INTO public.admin_actions_log (admin_user_id, action_type, target_profile_id, target_content_id, target_content_type, reason_notes, details)
    VALUES (v_admin_user_id, 'user_warned', p_target_profile_id, p_related_content_id, p_related_content_type, p_reason, jsonb_build_object('related_flag_id', p_related_flag_id));

    IF p_related_flag_id IS NOT NULL AND p_flag_table IS NOT NULL THEN
        PERFORM internal.update_related_flag_status(p_related_flag_id, p_flag_table, 'resolved_user_warned', v_admin_user_id, p_reason);
    END IF;

    UPDATE public.profiles SET status = 'warned', last_warning_at = now(), updated_at = now() WHERE id = p_target_profile_id RETURNING * INTO updated_profile;

    IF v_system_sender_id IS NOT NULL THEN
        v_warning_message_content := 'You have received a warning from an administrator. Reason: ' || COALESCE(p_reason, '(No specific reason provided)');
        BEGIN
            INSERT INTO public.messages (sender_id, receiver_id, content, is_system_message) VALUES (v_system_sender_id, p_target_profile_id, v_warning_message_content, TRUE);
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to send warning message to user %: %', p_target_profile_id, SQLERRM;
        END;
        BEGIN
            INSERT INTO public.user_notifications (user_id, title, message, notification_type, link_to)
            VALUES (p_target_profile_id, 'Administrator Warning', v_warning_message_content, 'content_moderation', NULL);
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to create user notification for warning (user: %): %', p_target_profile_id, SQLERRM;
        END;
    ELSIF v_system_sender_id IS NULL THEN
         RAISE WARNING 'System admin profile ID could not be determined (admin_email: [%]). Cannot send warning notifications to user %.', admin_profile_email, p_target_profile_id;
    END IF;
    
    RETURN NEXT updated_profile; RETURN;
END;
$$;
COMMENT ON FUNCTION public.admin_warn_user(UUID, TEXT, UUID, public.admin_action_target_type_enum, UUID, TEXT) IS 'Admin action: Warns a user, logs, updates profile, and notifies. Uses configured admin_email.';

-- 5. Update public.admin_ban_user
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
    admin_profile_email TEXT;
    v_ban_message_content TEXT;
    v_new_status public.profile_status_enum;
    v_ban_expires_at TIMESTAMPTZ;
    updated_profile public.profiles;
BEGIN
    PERFORM ensure_admin();

    admin_profile_email := internal.get_app_config('admin_email');
    IF admin_profile_email IS NULL THEN
        RAISE WARNING 'System admin email not found in app_config. Cannot send ban message.';
    ELSE
        SELECT id INTO v_system_sender_id FROM public.profiles WHERE email = admin_profile_email LIMIT 1;
        IF v_system_sender_id IS NULL THEN
            RAISE WARNING 'System admin profile for email [%] (from app_config) not found. Cannot send ban message.', admin_profile_email;
        END IF;
    END IF;

    IF p_duration_days IS NULL THEN
        v_new_status := 'banned_permanently';
        v_ban_expires_at := NULL;
        v_ban_message_content := 'You have been permanently banned by an administrator. Reason: ' || COALESCE(p_reason, '(No specific reason provided)');
    ELSE
        v_new_status := 'banned_temporarily';
        v_ban_expires_at := now() + (p_duration_days * INTERVAL '1 day');
        v_ban_message_content := 'You have been temporarily banned for ' || p_duration_days || ' days by an administrator. Reason: ' || COALESCE(p_reason, '(No specific reason provided)') || '. Your ban expires on ' || to_char(v_ban_expires_at, 'YYYY-MM-DD HH24:MI:SS TZ') || '.';
    END IF;

    INSERT INTO public.admin_actions_log (admin_user_id, action_type, target_profile_id, target_content_id, target_content_type, reason_notes, details)
    VALUES (v_admin_user_id, 'user_banned', p_target_profile_id, p_related_content_id, p_related_content_type, p_reason, jsonb_build_object('duration_days', p_duration_days, 'expires_at', v_ban_expires_at, 'related_flag_id', p_related_flag_id));

    IF p_related_flag_id IS NOT NULL AND p_flag_table IS NOT NULL THEN
        PERFORM internal.update_related_flag_status(p_related_flag_id, p_flag_table, 'resolved_user_banned', v_admin_user_id, p_reason);
    END IF;

    UPDATE public.profiles SET status = v_new_status, ban_expires_at = v_ban_expires_at, updated_at = now() WHERE id = p_target_profile_id RETURNING * INTO updated_profile;

    IF v_system_sender_id IS NOT NULL THEN
        BEGIN
            INSERT INTO public.messages (sender_id, receiver_id, content, is_system_message) VALUES (v_system_sender_id, p_target_profile_id, v_ban_message_content, TRUE);
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to send ban message to user %: %', p_target_profile_id, SQLERRM;
        END;
        BEGIN
            INSERT INTO public.user_notifications (user_id, title, message, notification_type, link_to)
            VALUES (p_target_profile_id, 'Account Banned', v_ban_message_content, 'content_moderation', NULL);
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to create user notification for ban (user: %): %', p_target_profile_id, SQLERRM;
        END;
    ELSIF v_system_sender_id IS NULL THEN
        RAISE WARNING 'System admin profile ID could not be determined (admin_email: [%]). Cannot send ban notifications to user %.', admin_profile_email, p_target_profile_id;
    END IF;

    RETURN NEXT updated_profile; RETURN;
END;
$$;
COMMENT ON FUNCTION public.admin_ban_user(UUID, TEXT, INT, UUID, public.admin_action_target_type_enum, UUID, TEXT) IS 'Admin action: Bans a user (temp/perm), logs, updates profile, and notifies. Uses configured admin_email.';

DO $$ BEGIN
  RAISE NOTICE 'Updated admin action RPCs to use internal.get_app_config for admin email.';
END $$; 