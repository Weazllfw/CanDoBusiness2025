-- supabase/migrations/YYYYMMDDHHMMSS_add_welcome_message_trigger.sql

-- 1. System User ID will be dynamically looked up by the function below.
-- The Node.js setup script ensures the admin user (rmarshall@itmarshall.net) and their profile exist.

-- 2. Create Function to Send Welcome Message
CREATE OR REPLACE FUNCTION public.send_welcome_message_to_new_user()
RETURNS TRIGGER AS $$
DECLARE
    system_user_id uuid;
    admin_profile_email TEXT := 'rmarshall@itmarshall.net'; -- System user's email to look up in profiles
    welcome_content text := '👋 Welcome to CanDo! We are excited to have you. Explore the platform and let us know if you have any questions.';
BEGIN
    RAISE NOTICE 'Welcome Message Trigger: Fired for new profile ID %', NEW.id; -- Changed from LOG

    SELECT id INTO system_user_id FROM public.profiles WHERE email = admin_profile_email LIMIT 1;

    IF system_user_id IS NULL THEN
        RAISE WARNING 'Welcome Message Trigger: System user profile for email [%] not found. Message not sent.', admin_profile_email;
        RETURN NEW; 
    ELSE
        RAISE NOTICE 'Welcome Message Trigger: Found system_user_id [%] for email [%]', system_user_id, admin_profile_email; -- Changed from LOG
    END IF;

    IF NEW.id = system_user_id THEN
        RAISE NOTICE 'Welcome Message Trigger: New user ID [%] is the same as system_user_id. No message sent to self.', NEW.id; -- Changed from LOG
        RETURN NEW;
    END IF;

    RAISE NOTICE 'Welcome Message Trigger: Attempting to insert message from [%] to [%]', system_user_id, NEW.id; -- Changed from LOG
    BEGIN
        INSERT INTO public.messages (sender_id, receiver_id, content)
        VALUES (system_user_id, NEW.id, welcome_content);
        RAISE NOTICE 'Welcome Message Trigger: Message inserted successfully from [%] to [%]', system_user_id, NEW.id; -- Changed from LOG
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Welcome Message Trigger: ERROR inserting welcome message from [%] to [%]. SQLSTATE: %, SQLERRM: %', system_user_id, NEW.id, SQLSTATE, SQLERRM;
            -- We let the main transaction (profile insertion) succeed despite welcome message failure.
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Trigger on public.profiles
DROP TRIGGER IF EXISTS trigger_send_welcome_message ON public.profiles;
CREATE TRIGGER trigger_send_welcome_message
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.send_welcome_message_to_new_user(); 