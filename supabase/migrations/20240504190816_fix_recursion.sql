-- Create a function to check if a user is a company owner
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

-- Create a function to check if a user is a company member
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

-- Drop all existing policies
DROP POLICY IF EXISTS "companies_select" ON companies;
DROP POLICY IF EXISTS "companies_insert" ON companies;
DROP POLICY IF EXISTS "companies_update" ON companies;
DROP POLICY IF EXISTS "companies_delete" ON companies;
DROP POLICY IF EXISTS "company_users_select" ON company_users;
DROP POLICY IF EXISTS "company_users_insert" ON company_users;
DROP POLICY IF EXISTS "company_users_update" ON company_users;
DROP POLICY IF EXISTS "company_users_delete" ON company_users;

-- Create new simplified policies for companies
CREATE POLICY "companies_select"
    ON companies FOR SELECT
    USING (is_company_member(id, auth.uid()));

CREATE POLICY "companies_insert"
    ON companies FOR INSERT
    WITH CHECK (current_setting('role') = 'postgres');

CREATE POLICY "companies_update"
    ON companies FOR UPDATE
    USING (is_company_owner(id, auth.uid()));

CREATE POLICY "companies_delete"
    ON companies FOR DELETE
    USING (is_company_owner(id, auth.uid()));

-- Create new simplified policies for company_users
CREATE POLICY "company_users_select"
    ON company_users FOR SELECT
    USING (
        user_id = auth.uid() OR
        is_company_owner(company_id, auth.uid())
    );

CREATE POLICY "company_users_insert"
    ON company_users FOR INSERT
    WITH CHECK (
        current_setting('role') = 'postgres' OR
        is_company_owner(company_id, auth.uid())
    );

CREATE POLICY "company_users_update"
    ON company_users FOR UPDATE
    USING (is_company_owner(company_id, auth.uid()));

CREATE POLICY "company_users_delete"
    ON company_users FOR DELETE
    USING (is_company_owner(company_id, auth.uid()));

-- Update the create_company_with_owner function to use proper role handling
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
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_company_id uuid;
    current_user_id uuid;
BEGIN
    -- Get the current user ID
    current_user_id := auth.uid();
    
    -- Set role to postgres for policy bypass
    SET LOCAL ROLE postgres;
    
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

    -- Reset role
    RESET ROLE;

    RETURN new_company_id;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION is_company_owner TO authenticated;
GRANT EXECUTE ON FUNCTION is_company_member TO authenticated;
GRANT EXECUTE ON FUNCTION create_company_with_owner TO authenticated; 