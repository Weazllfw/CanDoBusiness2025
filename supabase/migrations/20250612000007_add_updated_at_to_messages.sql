-- Migration: add_updated_at_to_messages
-- Description: Adds an updated_at column to public.messages and a trigger to auto-update it.

-- Add the updated_at column to public.messages
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON COLUMN public.messages.updated_at IS 'Timestamp of when the message was last updated.';

-- Create the trigger function to auto-update updated_at
CREATE OR REPLACE FUNCTION internal.set_updated_at_on_messages()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION internal.set_updated_at_on_messages() IS 'Sets the updated_at timestamp for the messages table upon update.';

-- Create the trigger on public.messages
DROP TRIGGER IF EXISTS trg_messages_updated_at ON public.messages;
CREATE TRIGGER trg_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION internal.set_updated_at_on_messages();

DO $$ BEGIN
  RAISE NOTICE 'Column updated_at added to public.messages and auto-update trigger created.';
END $$; 