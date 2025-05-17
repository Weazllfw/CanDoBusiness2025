DROP TABLE IF EXISTS public.user_connections CASCADE;
-- Migration to create the user_connections table and set up initial RLS policies

-- 1. Create the user_connections table
CREATE TABLE public.user_connections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'PENDING', -- e.g., 'PENDING', 'ACCEPTED', 'DECLINED', 'BLOCKED'
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT check_different_users CHECK (requester_id <> addressee_id),
    CONSTRAINT unique_connection_pair UNIQUE (requester_id, addressee_id)
);

-- Add comments to table and columns for clarity
COMMENT ON TABLE public.user_connections IS 'Stores direct connections between individual users, including their status.';
COMMENT ON COLUMN public.user_connections.requester_id IS 'The user who initiated the connection request.';
COMMENT ON COLUMN public.user_connections.addressee_id IS 'The user to whom the connection request was sent.';
COMMENT ON COLUMN public.user_connections.status IS 'Status of the connection (e.g., ''PENDING'', ''ACCEPTED'', ''DECLINED'', ''BLOCKED'').';

-- Create indexes for performance
DROP INDEX IF EXISTS idx_user_connections_requester_id;
CREATE INDEX IF NOT EXISTS idx_user_connections_requester_id ON public.user_connections(requester_id);
DROP INDEX IF EXISTS idx_user_connections_addressee_id;
CREATE INDEX IF NOT EXISTS idx_user_connections_addressee_id ON public.user_connections(addressee_id);
DROP INDEX IF EXISTS idx_user_connections_status;
CREATE INDEX IF NOT EXISTS idx_user_connections_status ON public.user_connections(status);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for user_connections

-- Allow users to read connection records they are part of
DROP POLICY IF EXISTS "Users can read their own connections" ON public.user_connections;
CREATE POLICY "Users can read their own connections"
ON public.user_connections
FOR SELECT
TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Allow users to insert connection requests where they are the requester
DROP POLICY IF EXISTS "Users can send connection requests" ON public.user_connections;
CREATE POLICY "Users can send connection requests"
ON public.user_connections
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = requester_id AND status = 'PENDING');

-- Allow addressee to update PENDING requests (accept/decline)
DROP POLICY IF EXISTS "Addressee can respond to PENDING requests" ON public.user_connections;
CREATE POLICY "Addressee can respond to PENDING requests"
ON public.user_connections
FOR UPDATE
TO authenticated
USING (auth.uid() = addressee_id AND status = 'PENDING')
WITH CHECK (auth.uid() = addressee_id AND status IN ('ACCEPTED', 'DECLINED'));

-- Allow either party to update an ACCEPTED connection (e.g., to block)
DROP POLICY IF EXISTS "Parties can update ACCEPTED connections" ON public.user_connections;
CREATE POLICY "Parties can update ACCEPTED connections"
ON public.user_connections
FOR UPDATE
TO authenticated
USING ((auth.uid() = requester_id OR auth.uid() = addressee_id) AND status = 'ACCEPTED')
WITH CHECK ((auth.uid() = requester_id OR auth.uid() = addressee_id) AND status IN ('BLOCKED')); -- Or other future states from ACCEPTED

-- Allow requester to delete PENDING requests they sent
DROP POLICY IF EXISTS "Requester can delete PENDING requests" ON public.user_connections;
CREATE POLICY "Requester can delete PENDING requests"
ON public.user_connections
FOR DELETE
TO authenticated
USING (auth.uid() = requester_id AND status = 'PENDING');

-- Allow either party to delete connections that are ACCEPTED, DECLINED, or BLOCKED
DROP POLICY IF EXISTS "Parties can delete terminal status connections" ON public.user_connections;
CREATE POLICY "Parties can delete terminal status connections"
ON public.user_connections
FOR DELETE
TO authenticated
USING ((auth.uid() = requester_id OR auth.uid() = addressee_id) AND status IN ('ACCEPTED', 'DECLINED', 'BLOCKED'));

-- Trigger to update updated_at on user_connections update
-- Uses the same function defined in 20250520000000_create_posts_table.sql migration
DROP TRIGGER IF EXISTS handle_user_connections_updated_at ON public.user_connections;
CREATE TRIGGER handle_user_connections_updated_at
BEFORE UPDATE ON public.user_connections
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at(); 