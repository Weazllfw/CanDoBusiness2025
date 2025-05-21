-- Migration: create_company_connections_table
-- Description: Creates the table to store company-to-company connection requests and statuses.

-- Ensure the connection_status_enum type exists (created in user_connections migration)
-- DO $$
-- BEGIN
--     IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'connection_status_enum') THEN
--         CREATE TYPE public.connection_status_enum AS ENUM (
--             'PENDING',
--             'ACCEPTED',
--             'DECLINED',
--             'BLOCKED'
--         );
--     END IF;
-- END$$;

-- 1. Create company_connections table
CREATE TABLE IF NOT EXISTS public.company_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    addressee_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    status public.connection_status_enum NOT NULL DEFAULT 'PENDING',
    requested_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT, -- User who initiated on behalf of requester_company_id
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ, -- When the request was accepted/declined/blocked

    CONSTRAINT company_connections_check_different_companies CHECK (requester_company_id <> addressee_company_id),
    -- Similar to user_connections, a unique constraint on the pair.
    CONSTRAINT company_connections_unique_pair UNIQUE (requester_company_id, addressee_company_id)
);

-- 2. Add Indexes
CREATE INDEX IF NOT EXISTS idx_company_connections_requester_id ON public.company_connections(requester_company_id);
CREATE INDEX IF NOT EXISTS idx_company_connections_addressee_id ON public.company_connections(addressee_company_id);
CREATE INDEX IF NOT EXISTS idx_company_connections_status ON public.company_connections(status);
CREATE INDEX IF NOT EXISTS idx_company_connections_requested_by_user_id ON public.company_connections(requested_by_user_id);

-- 3. Enable RLS
ALTER TABLE public.company_connections ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies (Initial Placeholder - TO BE REFINED BASED ON company_users and roles)
-- These policies are complex because they depend on how company admin/member roles are defined.
-- Assuming a function internal.is_company_admin(user_id UUID, company_id UUID) BOOLEAN exists.

-- Authenticated users can see ACCEPTED connections if their selected company (or any they admin) is part of it, or for public counts.
-- For now, let's make accepted connections generally visible for simplicity, as the details are not sensitive, only the count for non-admins.
-- Actual data returned by RPCs will be filtered more strictly.
DROP POLICY IF EXISTS "Public can view accepted company connections" ON public.company_connections;
CREATE POLICY "Public can view accepted company connections"
ON public.company_connections FOR SELECT
TO authenticated -- Or even `public` if counts are to be truly public, but `authenticated` is safer start
USING (status = 'ACCEPTED');

-- Company admins can see all connection records involving their company.
DROP POLICY IF EXISTS "Company admins can view their company connection records" ON public.company_connections;
CREATE POLICY "Company admins can view their company connection records"
ON public.company_connections FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.company_users cu 
        WHERE cu.company_id = requester_company_id AND cu.user_id = auth.uid() AND cu.role IN ('ADMIN', 'OWNER')
    )
    OR
    EXISTS (
        SELECT 1 FROM public.company_users cu 
        WHERE cu.company_id = addressee_company_id AND cu.user_id = auth.uid() AND cu.role IN ('ADMIN', 'OWNER')
    )
);

-- Authorized users (admins/owners of the requester company) can send connection requests.
DROP POLICY IF EXISTS "Company admins can send connection requests" ON public.company_connections;
CREATE POLICY "Company admins can send connection requests"
ON public.company_connections FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.company_users cu 
        WHERE cu.company_id = requester_company_id AND cu.user_id = auth.uid() AND cu.role IN ('ADMIN', 'OWNER')
    )
    AND requested_by_user_id = auth.uid()
    AND status = 'PENDING'
);

-- Authorized users (admins/owners of the requester company) can cancel their sent PENDING requests.
DROP POLICY IF EXISTS "Company admins can cancel their sent pending requests" ON public.company_connections;
CREATE POLICY "Company admins can cancel their sent pending requests"
ON public.company_connections FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.company_users cu 
        WHERE cu.company_id = requester_company_id AND cu.user_id = auth.uid() AND cu.role IN ('ADMIN', 'OWNER')
    )
    AND status = 'PENDING'
);

-- Authorized users (admins/owners of the addressee company) can respond to PENDING requests.
DROP POLICY IF EXISTS "Company admins can respond to pending connection requests" ON public.company_connections;
CREATE POLICY "Company admins can respond to pending connection requests"
ON public.company_connections FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.company_users cu 
        WHERE cu.company_id = addressee_company_id AND cu.user_id = auth.uid() AND cu.role IN ('ADMIN', 'OWNER')
    )
    AND status = 'PENDING'
)
WITH CHECK (
    status IN ('ACCEPTED', 'DECLINED') AND responded_at IS NOT NULL
);

-- Authorized users (admins/owners of either company) can remove/disconnect an ACCEPTED connection.
DROP POLICY IF EXISTS "Company admins can remove an accepted connection" ON public.company_connections;
CREATE POLICY "Company admins can remove an accepted connection"
ON public.company_connections FOR DELETE
TO authenticated
USING (
    status = 'ACCEPTED' AND
    (EXISTS (
        SELECT 1 FROM public.company_users cu 
        WHERE cu.company_id = requester_company_id AND cu.user_id = auth.uid() AND cu.role IN ('ADMIN', 'OWNER')
    )
    OR
    EXISTS (
        SELECT 1 FROM public.company_users cu 
        WHERE cu.company_id = addressee_company_id AND cu.user_id = auth.uid() AND cu.role IN ('ADMIN', 'OWNER')
    ))
);

-- TODO: Policies for BLOCKING companies.

-- 5. Comments
COMMENT ON TABLE public.company_connections IS 'Stores company-to-company connection requests and their statuses.';
COMMENT ON COLUMN public.company_connections.requested_by_user_id IS 'The user who initiated the connection request on behalf of the requester_company_id.'; 