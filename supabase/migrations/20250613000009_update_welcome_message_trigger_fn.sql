-- Migration: Update send_welcome_message_to_new_user to use app_config for admin email

BEGIN;

-- Drop the existing function if it exists (from 20240509000001_add_welcome_message_trigger.sql)
-- Note: The original function did not explicitly grant execute to any role.
-- The trigger runs as the definer, so the definer (usually postgres) needs execute on internal.get_app_config.
-- Ensure internal.get_app_config is usable by the function's definer.

-- Recreate Function to Send Welcome Message, using internal.get_app_config
CREATE OR REPLACE FUNCTION public.send_welcome_message_to_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal -- Ensure internal schema is in search_path
AS $$
DECLARE
    v_system_user_id uuid;
    v_admin_profile_email TEXT;
    v_welcome_content TEXT := '👋 Welcome to CanDo! We are excited to have you. Explore the platform and let us know if you have any questions.';
BEGIN
    RAISE NOTICE 'Welcome Message Trigger: Fired for new profile ID %', NEW.id;

    -- Get admin email from app_config
    SELECT internal.get_app_config('admin_email') INTO v_admin_profile_email;

    IF v_admin_profile_email IS NULL THEN
        RAISE WARNING 'Welcome Message Trigger: Admin email not found in internal.app_config. Message not sent.';
        RETURN NEW;
    END IF;

    -- Find system user ID by the configured admin email
    SELECT id INTO v_system_user_id FROM public.profiles WHERE email = v_admin_profile_email LIMIT 1;

    IF v_system_user_id IS NULL THEN
        RAISE WARNING 'Welcome Message Trigger: System user profile for email [%] (from app_config) not found. Message not sent.', v_admin_profile_email;
        RETURN NEW;
    END IF;

    RAISE NOTICE 'Welcome Message Trigger: Found system_user_id [%] for admin_email [%]', v_system_user_id, v_admin_profile_email;

    IF NEW.id = v_system_user_id THEN
        RAISE NOTICE 'Welcome Message Trigger: New user ID [%] is the same as system_user_id. No message sent to self.', NEW.id;
        RETURN NEW;
    END IF;

    RAISE NOTICE 'Welcome Message Trigger: Attempting to insert message from [%] to [%]', v_system_user_id, NEW.id;
    BEGIN
        INSERT INTO public.messages (sender_id, receiver_id, content, is_system_message)
        VALUES (v_system_user_id, NEW.id, v_welcome_content, TRUE); -- Mark as system message
        RAISE NOTICE 'Welcome Message Trigger: Message inserted successfully from [%] to [%]', v_system_user_id, NEW.id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Welcome Message Trigger: ERROR inserting welcome message from [%] to [%]. SQLSTATE: %, SQLERRM: %', v_system_user_id, NEW.id, SQLSTATE, SQLERRM;
            -- We let the main transaction (profile insertion) succeed despite welcome message failure.
    END;

    RETURN NEW;
END;
$$;

-- The trigger itself (trigger_send_welcome_message ON public.profiles) does not need to be recreated
-- as it already calls public.send_welcome_message_to_new_user().
-- We are only changing the body of the function.

COMMENT ON FUNCTION public.send_welcome_message_to_new_user() IS 'Sends a welcome message to a new user upon profile creation. Uses admin_email from internal.app_config for sender lookup. Runs as SECURITY DEFINER.';

COMMIT;

DO $$ BEGIN
  RAISE NOTICE 'Function public.send_welcome_message_to_new_user updated to use internal.app_config for admin email.';
END $$; 