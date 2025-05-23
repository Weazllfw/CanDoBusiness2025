-- Migration: Reinstate essential messaging columns for MVP

BEGIN;

-- Add acting_as_company_id to public.messages
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS acting_as_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.messages.acting_as_company_id IS 'ID of the company the sender is acting on behalf of, if any. Reinstated for MVP.';

-- Add target_is_company to public.messages
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS target_is_company BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.messages.target_is_company IS 'Indicates if the receiver_id for this message refers to a company. Reinstated for MVP.';

DO $$ BEGIN
  RAISE NOTICE 'Reinstated acting_as_company_id and target_is_company columns in public.messages for MVP functionality.';
END $$;

COMMIT; 