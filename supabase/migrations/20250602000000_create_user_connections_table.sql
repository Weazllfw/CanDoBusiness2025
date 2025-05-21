-- Migration: create_user_connections_table
-- Description: Creates the table to store user-to-user connection requests and statuses.

-- 1. Create connection_status_enum if it doesn't exist (as per NetworkingSystem.md but with DECLINED instead of REJECTED for consistency with my plan)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'connection_status_enum') THEN
        CREATE TYPE public.connection_status_enum AS ENUM (
            'PENDING',
            'ACCEPTED',
            'DECLINED', -- Using DECLINED as per my ConnectionSystem.md plan
            'BLOCKED'
        );
    END IF;
END$$;

-- 2. Create user_connections table
CREATE TABLE IF NOT EXISTS public.user_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status public.connection_status_enum NOT NULL DEFAULT 'PENDING',
    notes TEXT, -- Optional message with the request
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ, -- When the request was accepted/declined/blocked

    CONSTRAINT user_connections_check_different_users CHECK (requester_id <> addressee_id),
    -- To prevent duplicate PENDING requests or multiple active connections in one direction.
    -- A more complex unique constraint might be needed if we want to allow a new request after a DECLINED one.
    -- For now, this ensures only one non-DECLINED/non-BLOCKED record can exist between two users in one direction.
    -- Or, a unique index on (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id)) IF status is ACCEPTED might be better.
    -- Let's start simple: unique on (requester_id, addressee_id) means user A can request user B once.
    -- If user B declines, user A cannot send another request unless the old one is deleted or status changes.
    -- This might be too restrictive.
    -- Alternative: Unique on (requester_id, addressee_id) WHERE status = 'PENDING' OR status = 'ACCEPTED'
    -- For simplicity now, a basic unique constraint on the pair. Can be refined.
    CONSTRAINT user_connections_unique_pair UNIQUE (requester_id, addressee_id) 
);

-- 3. Add Indexes
CREATE INDEX IF NOT EXISTS idx_user_connections_requester_id ON public.user_connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_addressee_id ON public.user_connections(addressee_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_status ON public.user_connections(status);
-- Index for querying connections of a user regardless of being requester or addressee (for accepted connections)
-- This is more for the get_user_network style queries.
-- CREATE INDEX IF NOT EXISTS idx_user_connections_symmetric_users_accepted ON public.user_connections (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id)) WHERE status = 'ACCEPTED';

-- Ensure all columns exist with correct types and constraints before applying RLS policies or comments
ALTER TABLE public.user_connections
ADD COLUMN IF NOT EXISTS requester_id UUID,
ADD COLUMN IF NOT EXISTS addressee_id UUID,
ADD COLUMN IF NOT EXISTS status public.connection_status_enum,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

-- Add NOT NULL constraints and defaults separately, as ADD COLUMN IF NOT EXISTS cannot easily do this for existing columns.
-- This might fail if data violating this constraint already exists due to partial previous migrations.
-- However, for a clean setup, these are desired.
-- For requester_id (assuming profiles table exists and is populated as expected by FK)
ALTER TABLE public.user_connections
ALTER COLUMN requester_id SET NOT NULL;
-- Add FK constraint if it doesn't exist. This is more complex to do conditionally.
-- ALTER TABLE public.user_connections ADD CONSTRAINT user_connections_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- For addressee_id
ALTER TABLE public.user_connections
ALTER COLUMN addressee_id SET NOT NULL;
-- ALTER TABLE public.user_connections ADD CONSTRAINT user_connections_addressee_id_fkey FOREIGN KEY (addressee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- For status
ALTER TABLE public.user_connections
ALTER COLUMN status SET NOT NULL,
ALTER COLUMN status SET DEFAULT 'PENDING';

-- For requested_at
ALTER TABLE public.user_connections
ALTER COLUMN requested_at SET NOT NULL,
ALTER COLUMN requested_at SET DEFAULT NOW();

-- 4. Enable RLS
ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

DROP POLICY IF EXISTS "Users can view their own connection records" ON public.user_connections;
CREATE POLICY "Users can view their own connection records"
ON public.user_connections FOR SELECT
TO authenticated
USING (
    requester_id = auth.uid() OR addressee_id = auth.uid()
);

DROP POLICY IF EXISTS "Users can send connection requests" ON public.user_connections;
CREATE POLICY "Users can send connection requests"
ON public.user_connections FOR INSERT
TO authenticated
WITH CHECK (
    requester_id = auth.uid() AND status = 'PENDING'
);

DROP POLICY IF EXISTS "Users can cancel their sent pending requests" ON public.user_connections;
CREATE POLICY "Users can cancel their sent pending requests"
ON public.user_connections FOR DELETE
TO authenticated
USING (
    requester_id = auth.uid() AND status = 'PENDING'
);

DROP POLICY IF EXISTS "Addressees can respond to pending connection requests" ON public.user_connections;
CREATE POLICY "Addressees can respond to pending connection requests"
ON public.user_connections FOR UPDATE
TO authenticated
USING (addressee_id = auth.uid() AND status = 'PENDING')
WITH CHECK (
    status IN ('ACCEPTED', 'DECLINED') AND responded_at IS NOT NULL -- ensure responded_at is set
);

DROP POLICY IF EXISTS "Users can remove an accepted connection" ON public.user_connections;
CREATE POLICY "Users can remove an accepted connection"
ON public.user_connections FOR DELETE
TO authenticated
USING (
    (requester_id = auth.uid() OR addressee_id = auth.uid()) AND status = 'ACCEPTED'
);

-- Ensure other columns also exist before commenting
ALTER TABLE public.user_connections
ADD COLUMN IF NOT EXISTS notes TEXT;

-- TODO: Policies for BLOCKING
-- A user should be able to block another user. This could mean:
-- 1. Creating a new record with status = 'BLOCKED'.
-- 2. Updating an existing record to status = 'BLOCKED'.
-- This needs careful thought on how block overrides other statuses and visibility.
-- For now, focusing on PENDING, ACCEPTED, DECLINED.

-- 6. Comments on table and columns
COMMENT ON TABLE public.user_connections IS 'Stores user-to-user connection requests and their statuses, facilitating the networking feature.';
COMMENT ON COLUMN public.user_connections.id IS 'Unique identifier for the connection record.';
COMMENT ON COLUMN public.user_connections.requester_id IS 'The user who initiated the connection request.';
COMMENT ON COLUMN public.user_connections.addressee_id IS 'The user who is the recipient of the connection request.';
COMMENT ON COLUMN public.user_connections.status IS 'The current status of the connection (PENDING, ACCEPTED, DECLINED, BLOCKED).';
COMMENT ON COLUMN public.user_connections.notes IS 'Optional message included with the connection request by the requester.';
COMMENT ON COLUMN public.user_connections.requested_at IS 'Timestamp when the connection request was initiated.';
COMMENT ON COLUMN public.user_connections.responded_at IS 'Timestamp when the addressee responded (accepted, declined, or blocked).'; 