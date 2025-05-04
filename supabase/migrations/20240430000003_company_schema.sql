-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    trading_name text,
    registration_number text,
    tax_number text,
    email text,
    phone text,
    website text,
    address jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create company_users table for managing company memberships and roles
CREATE TABLE IF NOT EXISTS company_users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    is_primary boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(company_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_company_users_company_id ON company_users(company_id);
CREATE INDEX IF NOT EXISTS idx_company_users_user_id ON company_users(user_id);
CREATE INDEX IF NOT EXISTS idx_company_users_role ON company_users(role);

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_users_updated_at
    BEFORE UPDATE ON company_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_users ENABLE ROW LEVEL SECURITY;

-- Companies policies
CREATE POLICY "Users can view companies they belong to"
    ON companies FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM company_users
        WHERE company_users.company_id = companies.id
        AND company_users.user_id = auth.uid()
    ));

CREATE POLICY "Users with admin/owner role can update companies"
    ON companies FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM company_users
        WHERE company_users.company_id = companies.id
        AND company_users.user_id = auth.uid()
        AND company_users.role IN ('admin', 'owner')
    ));

CREATE POLICY "Users with owner role can delete companies"
    ON companies FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM company_users
        WHERE company_users.company_id = companies.id
        AND company_users.user_id = auth.uid()
        AND company_users.role = 'owner'
    ));

CREATE POLICY "Authenticated users can create companies"
    ON companies FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Company users policies
CREATE POLICY "Users can view members of their companies"
    ON company_users FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM company_users cu
        WHERE cu.company_id = company_users.company_id
        AND cu.user_id = auth.uid()
    ));

CREATE POLICY "Only owners can manage company users"
    ON company_users FOR ALL
    USING (EXISTS (
        SELECT 1 FROM company_users cu
        WHERE cu.company_id = company_users.company_id
        AND cu.user_id = auth.uid()
        AND cu.role = 'owner'
    ));

-- Helper functions
CREATE OR REPLACE FUNCTION get_user_companies(p_user_id uuid)
RETURNS TABLE (
    company_id uuid,
    company_name text,
    user_role text,
    is_primary boolean
) 
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as company_id,
        c.name as company_name,
        cu.role as user_role,
        cu.is_primary
    FROM public.companies c
    INNER JOIN public.company_users cu ON cu.company_id = c.id
    WHERE cu.user_id = p_user_id
    ORDER BY cu.is_primary DESC, c.name ASC;
END;
$$;

-- Grant permissions
GRANT ALL ON public.companies TO authenticated;
GRANT ALL ON public.company_users TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_companies(uuid) TO authenticated; 