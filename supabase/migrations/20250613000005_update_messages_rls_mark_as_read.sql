-- Migration to update RLS policy on public.messages for marking messages as read

BEGIN;

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can mark their received messages as read" ON public.messages;

-- Recreate the policy with the corrected WITH CHECK clause
CREATE POLICY "Users can mark their received messages as read"
ON public.messages FOR UPDATE
USING (auth.uid() = receiver_id AND is_system_message = FALSE) -- Users can only update their own non-system messages
WITH CHECK (auth.uid() = receiver_id AND is_system_message = FALSE); -- Ensure the row remains their own non-system message

COMMENT ON POLICY "Users can mark their received messages as read" ON public.messages 
IS 'Allows users to update their own received, non-system messages (e.g., to mark them as read).';

DO $$ BEGIN
  RAISE NOTICE 'RLS policy "Users can mark their received messages as read" on public.messages updated.';
END $$;

COMMIT; 