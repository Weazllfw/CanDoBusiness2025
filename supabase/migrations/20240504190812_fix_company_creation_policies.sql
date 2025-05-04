-- Drop existing problematic policies
DROP POLICY IF EXISTS "Authenticated users can create companies" ON companies;
DROP POLICY IF EXISTS "Users can create their own initial company membership" ON company_users;

-- Create a function to safely create a company with owner
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
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    new_company_id uuid;
BEGIN
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
        auth.uid(),
        'owner',
        NOT EXISTS (
            SELECT 1 FROM company_users WHERE user_id = auth.uid()
        )
    );

    RETURN new_company_id;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION create_company_with_owner(text, text, text, text, text, text, text, jsonb) TO authenticated;

-- Modify company creation policy to prevent direct inserts
CREATE POLICY "Companies can only be created through the create_company_with_owner function"
    ON companies FOR INSERT
    WITH CHECK (FALSE);  -- Prevent direct inserts, must use the function

-- Add policy for company membership creation through the function
CREATE POLICY "Company users can only be created through the create_company_with_owner function or by owners"
    ON company_users FOR INSERT
    WITH CHECK (
        -- Allow the security definer function to create the initial owner
        (SELECT current_setting('role') = 'postgres')
        OR
        -- Allow existing owners to add new users
        (
            company_id IN (
                SELECT company_id 
                FROM company_users 
                WHERE user_id = auth.uid() 
                AND role = 'owner'
            )
        )
    ); 