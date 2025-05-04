-- First, disable RLS temporarily to check state
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE company_users DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "companies_select" ON companies;
DROP POLICY IF EXISTS "companies_insert" ON companies;
DROP POLICY IF EXISTS "companies_update" ON companies;
DROP POLICY IF EXISTS "companies_delete" ON companies;
DROP POLICY IF EXISTS "company_users_select" ON company_users;
DROP POLICY IF EXISTS "company_users_insert" ON company_users;
DROP POLICY IF EXISTS "company_users_update" ON company_users;
DROP POLICY IF EXISTS "company_users_delete" ON company_users;

-- Drop and recreate the function without SECURITY DEFINER first
DROP FUNCTION IF EXISTS create_company_with_owner;

-- Create a temporary function to handle company creation
CREATE OR REPLACE FUNCTION create_company_with_owner(
    company_name text,
    company_trading_name text DEFAULT NULL,
    company_registration_number text DEFAULT NULL,
    company_tax_number text DEFAULT NULL,
    company_email text DEFAULT NULL,
    company_phone text DEFAULT NULL,
    company_website text DEFAULT NULL,
    company_address jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    new_company_id uuid;
    current_user_id uuid;
BEGIN
    -- Get the current user ID
    current_user_id := auth.uid();
    
    -- Insert the company
    INSERT INTO companies (
        name,
        trading_name,
        registration_number,
        tax_number,
        email,
        phone,
        website,
        address
    ) VALUES (
        company_name,
        company_trading_name,
        company_registration_number,
        company_tax_number,
        company_email,
        company_phone,
        company_website,
        company_address
    )
    RETURNING id INTO new_company_id;

    -- Create the owner relationship
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

-- Re-enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_users ENABLE ROW LEVEL SECURITY;

-- Create minimal policies first
CREATE POLICY "allow_all_companies"
    ON companies FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "allow_all_company_users"
    ON company_users FOR ALL
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_company_with_owner TO authenticated;
GRANT ALL ON companies TO authenticated;
GRANT ALL ON company_users TO authenticated; 