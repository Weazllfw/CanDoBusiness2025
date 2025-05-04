-- Drop existing policies first
DROP POLICY IF EXISTS "companies_insert" ON companies;
DROP POLICY IF EXISTS "company_users_insert" ON company_users;

-- Update the create_company_with_owner function to work without SET ROLE
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
    
    -- Insert the company
    -- Security definer allows us to bypass RLS directly
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
    -- Security definer allows us to bypass RLS directly
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

-- Create new policies
CREATE POLICY "companies_insert"
    ON companies FOR INSERT
    WITH CHECK (
        -- The function runs as the definer (postgres) so we check for that
        current_user = 'postgres'
    );

CREATE POLICY "company_users_insert"
    ON company_users FOR INSERT
    WITH CHECK (
        -- Allow postgres user (for the function) or company owners
        current_user = 'postgres' OR
        is_company_owner(company_id, auth.uid())
    ); 