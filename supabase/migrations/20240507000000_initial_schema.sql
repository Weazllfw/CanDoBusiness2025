-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create tables
CREATE TABLE companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    name TEXT NOT NULL,
    description TEXT,
    website TEXT,
    location TEXT,
    industry TEXT,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE rfqs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    budget DECIMAL,
    currency TEXT DEFAULT 'USD',
    deadline TIMESTAMP WITH TIME ZONE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed'))
);

CREATE TABLE posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    content TEXT NOT NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('general', 'rfq')),
    title TEXT,
    rfq_id UUID REFERENCES rfqs(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX companies_owner_id_idx ON companies(owner_id);
CREATE INDEX posts_company_id_idx ON posts(company_id);
CREATE INDEX posts_rfq_id_idx ON posts(rfq_id);
CREATE INDEX rfqs_company_id_idx ON rfqs(company_id);

-- Create RLS policies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Companies policies
CREATE POLICY "Companies are viewable by everyone"
    ON companies FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own companies"
    ON companies FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own companies"
    ON companies FOR UPDATE
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own companies"
    ON companies FOR DELETE
    USING (auth.uid() = owner_id);

-- RFQ policies
CREATE POLICY "RFQs are viewable by everyone"
    ON rfqs FOR SELECT
    USING (true);

CREATE POLICY "Company owners can create RFQs"
    ON rfqs FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM companies
        WHERE companies.id = rfqs.company_id
        AND companies.owner_id = auth.uid()
    ));

CREATE POLICY "Company owners can update RFQs"
    ON rfqs FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM companies
        WHERE companies.id = rfqs.company_id
        AND companies.owner_id = auth.uid()
    ));

CREATE POLICY "Company owners can delete RFQs"
    ON rfqs FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM companies
        WHERE companies.id = rfqs.company_id
        AND companies.owner_id = auth.uid()
    ));

-- Posts policies
CREATE POLICY "Posts are viewable by everyone"
    ON posts FOR SELECT
    USING (true);

CREATE POLICY "Company owners can create posts"
    ON posts FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM companies
        WHERE companies.id = posts.company_id
        AND companies.owner_id = auth.uid()
    ));

CREATE POLICY "Company owners can update posts"
    ON posts FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM companies
        WHERE companies.id = posts.company_id
        AND companies.owner_id = auth.uid()
    ));

CREATE POLICY "Company owners can delete posts"
    ON posts FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM companies
        WHERE companies.id = posts.company_id
        AND companies.owner_id = auth.uid()
    ));

-- Functions
CREATE OR REPLACE FUNCTION get_user_companies(user_id UUID)
RETURNS SETOF companies
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT * FROM companies WHERE owner_id = user_id;
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