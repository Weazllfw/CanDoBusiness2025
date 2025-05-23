-- Migration to update the security context of public.mark_messages_as_read RPC

BEGIN;

-- Drop the existing function
DROP FUNCTION IF EXISTS public.mark_messages_as_read(UUID);

-- Recreate the function with SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(p_other_user_id UUID)
RETURNS BOOLEAN -- Returns true if any messages were updated, false otherwise
LANGUAGE plpgsql
SECURITY INVOKER -- Changed from DEFINER to INVOKER
SET search_path = public
AS $$
DECLARE
    v_current_user_id UUID := auth.uid();
BEGIN
    IF v_current_user_id = p_other_user_id THEN
        -- No action needed if trying to mark messages from oneself as read (shouldn't happen for received messages)
        RETURN FALSE;
    END IF;

    UPDATE public.messages
    SET read = TRUE,
        updated_at = now() -- updated_at column was added in 20250612000007_add_updated_at_to_messages.sql
    WHERE receiver_id = v_current_user_id
      AND sender_id = p_other_user_id
      AND read = FALSE
      AND is_system_message = FALSE; -- Users only mark non-system messages as read

    RETURN FOUND; -- FOUND is true if at least one row was affected by the UPDATE
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_messages_as_read(UUID) TO authenticated;

COMMENT ON FUNCTION public.mark_messages_as_read(UUID) 
IS 'Allows an authenticated user to mark all unread, non-system messages received from a specific other user as read. Returns true if successful. Runs with invoker security.';

DO $$ BEGIN
  RAISE NOTICE 'RPC function mark_messages_as_read updated to SECURITY INVOKER.';
END $$;

COMMIT; 