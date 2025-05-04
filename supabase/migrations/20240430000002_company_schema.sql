-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    trading_name text,
    business_number text,
    tax_number text,
    email text,
    phone text,
    website text,
    address jsonb DEFAULT '{}'::jsonb,
    industry_tags text[] DEFAULT '{}'::text[],
    capability_tags text[] DEFAULT '{}'::text[],
    region_tags text[] DEFAULT '{}'::text[],
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create company_users table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_industry_tags ON companies USING gin(industry_tags);
CREATE INDEX IF NOT EXISTS idx_companies_capability_tags ON companies USING gin(capability_tags);
CREATE INDEX IF NOT EXISTS idx_companies_region_tags ON companies USING gin(region_tags);
CREATE INDEX IF NOT EXISTS idx_company_users_company_id ON company_users(company_id);
CREATE INDEX IF NOT EXISTS idx_company_users_user_id ON company_users(user_id);
CREATE INDEX IF NOT EXISTS idx_company_users_role ON company_users(role);

-- Add triggers for updated_at
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_users_updated_at
    BEFORE UPDATE ON company_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Helper functions
CREATE OR REPLACE FUNCTION is_company_owner(company_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM company_users 
        WHERE company_users.company_id = $1
        AND company_users.user_id = $2
        AND company_users.role = 'owner'
    );
$$;

CREATE OR REPLACE FUNCTION is_company_member(company_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM company_users 
        WHERE company_users.company_id = $1
        AND company_users.user_id = $2
    );
$$;

-- Main company creation function
CREATE OR REPLACE FUNCTION create_company_with_owner(
    company_name text,
    company_trading_name text DEFAULT NULL,
    company_business_number text DEFAULT NULL,
    company_tax_number text DEFAULT NULL,
    company_email text DEFAULT NULL,
    company_phone text DEFAULT NULL,
    company_website text DEFAULT NULL,
    company_address jsonb DEFAULT '{}'::jsonb,
    company_industry_tags text[] DEFAULT '{}'::text[],
    company_capability_tags text[] DEFAULT '{}'::text[],
    company_region_tags text[] DEFAULT '{}'::text[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_company_id uuid;
    current_user_id uuid;
BEGIN
    current_user_id := auth.uid();
    
    INSERT INTO companies (
        name,
        trading_name,
        business_number,
        tax_number,
        email,
        phone,
        website,
        address,
        industry_tags,
        capability_tags,
        region_tags
    ) VALUES (
        company_name,
        company_trading_name,
        company_business_number,
        company_tax_number,
        company_email,
        company_phone,
        company_website,
        company_address,
        company_industry_tags,
        company_capability_tags,
        company_region_tags
    )
    RETURNING id INTO new_company_id;

    INSERT INTO company_users (
        company_id,
        user_id,
        role,
        is_primary
    ) VALUES (
        new_company_id,
        current_user_id,
        'owner',
        NOT EXISTS (
            SELECT 1 FROM company_users WHERE user_id = current_user_id
        )
    );

    RETURN new_company_id;
END;
$$;

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_users ENABLE ROW LEVEL SECURITY;

-- Company policies
CREATE POLICY "companies_select"
    ON companies FOR SELECT
    USING (is_company_member(id, auth.uid()));

CREATE POLICY "companies_insert"
    ON companies FOR INSERT
    WITH CHECK (current_user = 'postgres');

CREATE POLICY "companies_update"
    ON companies FOR UPDATE
    USING (is_company_owner(id, auth.uid()))
    WITH CHECK (is_company_owner(id, auth.uid()));

CREATE POLICY "companies_delete"
    ON companies FOR DELETE
    USING (is_company_owner(id, auth.uid()));

-- Company users policies
CREATE POLICY "Users can view their own membership"
    ON company_users FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins/Owners can view other memberships in their companies"
    ON company_users FOR SELECT
    USING (
      company_id IN (
        SELECT cu.company_id
        FROM company_users cu
        WHERE cu.user_id = auth.uid() AND cu.role IN ('admin', 'owner')
      )
    );

CREATE POLICY "Owners can add members to their company"
    ON company_users FOR INSERT
    WITH CHECK (
      current_user = 'postgres' OR
      company_id IN (
        SELECT cu.company_id
        FROM company_users cu
        WHERE cu.user_id = auth.uid() AND cu.role = 'owner'
      )
    );

CREATE POLICY "Owners can update members in their company"
    ON company_users FOR UPDATE
    USING (
      company_id IN (
        SELECT cu.company_id
        FROM company_users cu
        WHERE cu.user_id = auth.uid() AND cu.role = 'owner'
      )
    );

CREATE POLICY "Owners can delete members from their company"
    ON company_users FOR DELETE
    USING (
      company_id IN (
        SELECT cu.company_id
        FROM company_users cu
        WHERE cu.user_id = auth.uid() AND cu.role = 'owner'
      )
    );

-- Grant permissions
GRANT EXECUTE ON FUNCTION is_company_owner TO authenticated;
GRANT EXECUTE ON FUNCTION is_company_member TO authenticated;
GRANT EXECUTE ON FUNCTION create_company_with_owner TO authenticated;
GRANT ALL ON companies TO authenticated;
GRANT ALL ON company_users TO authenticated; 