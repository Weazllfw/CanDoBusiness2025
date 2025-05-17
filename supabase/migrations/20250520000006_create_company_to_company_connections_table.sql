DROP TABLE IF EXISTS public.company_to_company_connections CASCADE;
-- Migration to create the company_to_company_connections table and set up initial RLS policies

-- 1. Create the company_to_company_connections table
CREATE TABLE public.company_to_company_connections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    target_company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    connection_type text NOT NULL, -- e.g., 'FOLLOWING', 'PARTNERSHIP_REQUESTED', 'PARTNERSHIP_ACCEPTED', 'PARTNERSHIP_DECLINED'
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT check_different_companies CHECK (source_company_id <> target_company_id),
    CONSTRAINT unique_company_connection_type UNIQUE (source_company_id, target_company_id, connection_type)
);

-- Add comments to table and columns for clarity
COMMENT ON TABLE public.company_to_company_connections IS 'Stores connections between companies, such as follows or partnerships.';
COMMENT ON COLUMN public.company_to_company_connections.source_company_id IS 'The company initiating the connection/action.';
COMMENT ON COLUMN public.company_to_company_connections.target_company_id IS 'The company being targeted by the connection/action.';
COMMENT ON COLUMN public.company_to_company_connections.connection_type IS 'Type of connection (e.g., ''FOLLOWING'', ''PARTNERSHIP_REQUESTED'', ''PARTNERSHIP_ACCEPTED'', ''PARTNERSHIP_DECLINED'').';

-- Create indexes for performance
DROP INDEX IF EXISTS idx_ctc_source_company_id;
CREATE INDEX IF NOT EXISTS idx_ctc_source_company_id ON public.company_to_company_connections(source_company_id);
DROP INDEX IF EXISTS idx_ctc_target_company_id;
CREATE INDEX IF NOT EXISTS idx_ctc_target_company_id ON public.company_to_company_connections(target_company_id);
DROP INDEX IF EXISTS idx_ctc_connection_type;
CREATE INDEX IF NOT EXISTS idx_ctc_connection_type ON public.company_to_company_connections(connection_type);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.company_to_company_connections ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for company_to_company_connections

-- Allow authenticated users to read all company connections (public information)
DROP POLICY IF EXISTS "Allow authenticated read of company connections" ON public.company_to_company_connections;
CREATE POLICY "Allow authenticated read of company connections"
ON public.company_to_company_connections
FOR SELECT
TO authenticated
USING (true);

-- Allow owner of source company to insert 'FOLLOWING' or 'PARTNERSHIP_REQUESTED' connections
DROP POLICY IF EXISTS "Source company owner can initiate connections" ON public.company_to_company_connections;
CREATE POLICY "Source company owner can initiate connections"
ON public.company_to_company_connections
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM public.companies c WHERE c.id = source_company_id AND c.owner_id = auth.uid()) AND
    connection_type IN ('FOLLOWING', 'PARTNERSHIP_REQUESTED')
);

-- Allow owner of target company to update 'PARTNERSHIP_REQUESTED' to 'ACCEPTED' or 'DECLINED'
DROP POLICY IF EXISTS "Target company owner can respond to partnership requests" ON public.company_to_company_connections;
CREATE POLICY "Target company owner can respond to partnership requests"
ON public.company_to_company_connections
FOR UPDATE
TO authenticated
USING (
    connection_type = 'PARTNERSHIP_REQUESTED' AND
    EXISTS (SELECT 1 FROM public.companies c WHERE c.id = target_company_id AND c.owner_id = auth.uid())
)
WITH CHECK (
    connection_type IN ('PARTNERSHIP_ACCEPTED', 'PARTNERSHIP_DECLINED') AND
    EXISTS (SELECT 1 FROM public.companies c WHERE c.id = target_company_id AND c.owner_id = auth.uid())
);

-- Allow owner of source company to delete 'FOLLOWING' or 'PARTNERSHIP_REQUESTED' they initiated
DROP POLICY IF EXISTS "Source company owner can delete initiated connections" ON public.company_to_company_connections;
CREATE POLICY "Source company owner can delete initiated connections"
ON public.company_to_company_connections
FOR DELETE
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.companies c WHERE c.id = source_company_id AND c.owner_id = auth.uid()) AND
    connection_type IN ('FOLLOWING', 'PARTNERSHIP_REQUESTED')
);

-- Allow owner of either company to delete 'PARTNERSHIP_ACCEPTED' or 'PARTNERSHIP_DECLINED' connections
DROP POLICY IF EXISTS "Either company owner can delete terminal partnerships" ON public.company_to_company_connections;
CREATE POLICY "Either company owner can delete terminal partnerships"
ON public.company_to_company_connections
FOR DELETE
TO authenticated
USING (
    connection_type IN ('PARTNERSHIP_ACCEPTED', 'PARTNERSHIP_DECLINED') AND
    (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = source_company_id AND c.owner_id = auth.uid()) OR
     EXISTS (SELECT 1 FROM public.companies c WHERE c.id = target_company_id AND c.owner_id = auth.uid()))
);

-- Trigger to update updated_at on company_to_company_connections update
-- Uses the same function defined in 20250520000000_create_posts_table.sql migration
DROP TRIGGER IF EXISTS handle_company_to_company_connections_updated_at ON public.company_to_company_connections;
CREATE TRIGGER handle_company_to_company_connections_updated_at
BEFORE UPDATE ON public.company_to_company_connections
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at(); 