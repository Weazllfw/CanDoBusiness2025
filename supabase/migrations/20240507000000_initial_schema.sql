-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create tables
DROP TABLE IF EXISTS public.companies CASCADE;
CREATE TABLE public.companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    name TEXT NOT NULL,
    description TEXT,
    website TEXT,
    location TEXT,
    industry TEXT,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS public.rfqs CASCADE;
CREATE TABLE public.rfqs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    budget DECIMAL,
    currency TEXT DEFAULT 'USD',
    deadline TIMESTAMP WITH TIME ZONE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed'))
);

DROP TABLE IF EXISTS public.posts CASCADE;
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    content TEXT NOT NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('general', 'rfq')),
    title TEXT,
    rfq_id UUID REFERENCES public.rfqs(id) ON DELETE SET NULL
);

-- Create indexes
DROP INDEX IF EXISTS companies_owner_id_idx;
CREATE INDEX IF NOT EXISTS companies_owner_id_idx ON public.companies(owner_id);
DROP INDEX IF EXISTS posts_company_id_idx;
CREATE INDEX IF NOT EXISTS posts_company_id_idx ON public.posts(company_id);
DROP INDEX IF EXISTS posts_rfq_id_idx;
CREATE INDEX IF NOT EXISTS posts_rfq_id_idx ON public.posts(rfq_id);
DROP INDEX IF EXISTS rfqs_company_id_idx;
CREATE INDEX IF NOT EXISTS rfqs_company_id_idx ON public.rfqs(company_id);

-- Create RLS policies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Companies policies
DROP POLICY IF EXISTS "Companies are viewable by everyone" ON public.companies;
CREATE POLICY "Companies are viewable by everyone"
    ON public.companies FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can insert their own companies" ON public.companies;
CREATE POLICY "Users can insert their own companies"
    ON public.companies FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update their own companies" ON public.companies;
CREATE POLICY "Users can update their own companies"
    ON public.companies FOR UPDATE
    USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can delete their own companies" ON public.companies;
CREATE POLICY "Users can delete their own companies"
    ON public.companies FOR DELETE
    USING (auth.uid() = owner_id);

-- RFQ policies
DROP POLICY IF EXISTS "RFQs are viewable by everyone" ON public.rfqs;
CREATE POLICY "RFQs are viewable by everyone"
    ON public.rfqs FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Company owners can create RFQs" ON public.rfqs;
CREATE POLICY "Company owners can create RFQs"
    ON public.rfqs FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.companies
        WHERE public.companies.id = public.rfqs.company_id
        AND public.companies.owner_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Company owners can update RFQs" ON public.rfqs;
CREATE POLICY "Company owners can update RFQs"
    ON public.rfqs FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.companies
        WHERE public.companies.id = public.rfqs.company_id
        AND public.companies.owner_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Company owners can delete RFQs" ON public.rfqs;
CREATE POLICY "Company owners can delete RFQs"
    ON public.rfqs FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.companies
        WHERE public.companies.id = public.rfqs.company_id
        AND public.companies.owner_id = auth.uid()
    ));

-- Posts policies
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
CREATE POLICY "Posts are viewable by everyone"
    ON public.posts FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Company owners can create posts" ON public.posts;
CREATE POLICY "Company owners can create posts"
    ON public.posts FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.companies
        WHERE public.companies.id = public.posts.company_id
        AND public.companies.owner_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Company owners can update posts" ON public.posts;
CREATE POLICY "Company owners can update posts"
    ON public.posts FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.companies
        WHERE public.companies.id = public.posts.company_id
        AND public.companies.owner_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Company owners can delete posts" ON public.posts;
CREATE POLICY "Company owners can delete posts"
    ON public.posts FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.companies
        WHERE public.companies.id = public.posts.company_id
        AND public.companies.owner_id = auth.uid()
    ));

-- Functions
CREATE OR REPLACE FUNCTION public.get_user_companies(user_id UUID)
RETURNS SETOF public.companies
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT * FROM public.companies WHERE owner_id = user_id;
$$;

-- Function to internally upsert a public.profiles record for an existing auth.users user.
-- This function is intended to be called by a setup script after an auth user has been created.
-- It ensures the user's profile information is correctly seeded.
CREATE OR REPLACE FUNCTION public.internal_upsert_profile_for_user(
    p_user_id UUID,    -- This user MUST already exist in auth.users
    p_email TEXT,      -- Email to store in the profiles table
    p_name TEXT,       -- Name to store in the profiles table
    p_avatar_url TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- May not be strictly necessary if called by superuser script, but good practice.
AS $$
BEGIN
    -- Ensure search_path is set to public for profile operations
    SET search_path = public;

    INSERT INTO public.profiles (id, email, name, avatar_url, updated_at, created_at)
    VALUES (
        p_user_id,
        p_email,
        p_name,
        p_avatar_url,
        NOW(),
        NOW() -- Set created_at on initial insert
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = NOW();
END;
$$;

-- Original internal_upsert_system_user_and_profile is now removed or commented out
-- as its auth.users functionality is superseded by the Node.js setup script.
/*
CREATE OR REPLACE FUNCTION public.internal_upsert_system_user_and_profile(
    p_user_id UUID,
    p_email TEXT,
    p_raw_app_meta_data JSONB,
    p_name TEXT,
    p_avatar_url TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    SET search_path = auth, public;
    INSERT INTO auth.users (id, email, encrypted_password, role, aud, raw_app_meta_data, created_at, updated_at, email_confirmed_at)
    VALUES (
        p_user_id,
        p_email,
        'system-generated-non-loginable',
        'authenticated',
        'authenticated',
        p_raw_app_meta_data,
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        raw_app_meta_data = EXCLUDED.raw_app_meta_data,
        updated_at = NOW(),
        email_confirmed_at = NOW();

    SET search_path = public;
    INSERT INTO public.profiles (id, email, name, avatar_url, updated_at, created_at)
    VALUES (
        p_user_id,
        p_email, -- Added email here
        p_name,
        p_avatar_url,
        NOW(),
        NOW() -- Ensure created_at is set on initial insert if not defaulted by table
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email, -- Added email here
        name = EXCLUDED.name,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = NOW();
END;
$$;
*/ 