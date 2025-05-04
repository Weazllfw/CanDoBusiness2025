-- Drop existing function
DROP FUNCTION IF EXISTS create_company_with_owner;

-- Recreate the function with proper role handling
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
SET role = 'postgres'
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

-- Drop all existing policies
DROP POLICY IF EXISTS "view_companies" ON companies;
DROP POLICY IF EXISTS "update_companies" ON companies;
DROP POLICY IF EXISTS "delete_companies" ON companies;
DROP POLICY IF EXISTS "insert_companies" ON companies;
DROP POLICY IF EXISTS "view_company_users" ON company_users;
DROP POLICY IF EXISTS "insert_company_users" ON company_users;
DROP POLICY IF EXISTS "update_company_users" ON company_users;
DROP POLICY IF EXISTS "delete_company_users" ON company_users;

-- Create simplified policies for companies
CREATE POLICY "companies_select"
    ON companies FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM company_users
            WHERE company_users.company_id = id
            AND company_users.user_id = auth.uid()
        )
    );

CREATE POLICY "companies_insert"
    ON companies FOR INSERT
    WITH CHECK (
        -- Only allow inserts from our function
        (SELECT current_setting('role'::text)) = 'postgres'
    );

CREATE POLICY "companies_update"
    ON companies FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM company_users
            WHERE company_users.company_id = id
            AND company_users.user_id = auth.uid()
            AND company_users.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "companies_delete"
    ON companies FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM company_users
            WHERE company_users.company_id = id
            AND company_users.user_id = auth.uid()
            AND company_users.role = 'owner'
        )
    );

-- Create simplified policies for company_users
CREATE POLICY "company_users_select"
    ON company_users FOR SELECT
    USING (
        -- Users can see their own memberships
        user_id = auth.uid()
        OR
        -- Owners can see all members of their companies
        EXISTS (
            SELECT 1 FROM company_users owners
            WHERE owners.company_id = company_users.company_id
            AND owners.user_id = auth.uid()
            AND owners.role = 'owner'
        )
    );

CREATE POLICY "company_users_insert"
    ON company_users FOR INSERT
    WITH CHECK (
        -- Only allow inserts from our function or from owners
        (SELECT current_setting('role'::text)) = 'postgres'
        OR
        EXISTS (
            SELECT 1 FROM company_users owners
            WHERE owners.company_id = company_id
            AND owners.user_id = auth.uid()
            AND owners.role = 'owner'
        )
    );

CREATE POLICY "company_users_update"
    ON company_users FOR UPDATE
    USING (
        -- Only owners can update memberships
        EXISTS (
            SELECT 1 FROM company_users owners
            WHERE owners.company_id = company_id
            AND owners.user_id = auth.uid()
            AND owners.role = 'owner'
        )
    );

CREATE POLICY "company_users_delete"
    ON company_users FOR DELETE
    USING (
        -- Only owners can delete memberships
        EXISTS (
            SELECT 1 FROM company_users owners
            WHERE owners.company_id = company_id
            AND owners.user_id = auth.uid()
            AND owners.role = 'owner'
        )
    );

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_company_with_owner TO authenticated;
GRANT ALL ON companies TO authenticated;
GRANT ALL ON company_users TO authenticated; 