-- First, drop ALL existing policies for companies and company_users
DROP POLICY IF EXISTS "Users can view companies they belong to" ON companies;
DROP POLICY IF EXISTS "Users with admin/owner role can update companies" ON companies;
DROP POLICY IF EXISTS "Users with owner role can delete companies" ON companies;
DROP POLICY IF EXISTS "Authenticated users can create companies" ON companies;
DROP POLICY IF EXISTS "Companies can only be created through the create_company_with_owner function" ON companies;

DROP POLICY IF EXISTS "Users can view members of their companies" ON company_users;
DROP POLICY IF EXISTS "Only owners can manage company users" ON company_users;
DROP POLICY IF EXISTS "Users can view their own company memberships" ON company_users;
DROP POLICY IF EXISTS "Users can view company members where they are owners" ON company_users;
DROP POLICY IF EXISTS "Owners can insert new company users" ON company_users;
DROP POLICY IF EXISTS "Owners can update company users" ON company_users;
DROP POLICY IF EXISTS "Owners can delete company users" ON company_users;
DROP POLICY IF EXISTS "Users can create their own initial company membership" ON company_users;
DROP POLICY IF EXISTS "Company users can only be created through the create_company_with_owner function or by owners" ON company_users;

-- Create new simplified policies for companies

-- View policy: Users can view companies they belong to
CREATE POLICY "view_companies"
    ON companies FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM company_users
            WHERE company_users.company_id = id
            AND company_users.user_id = auth.uid()
        )
    );

-- Update policy: Only owners/admins can update their companies
CREATE POLICY "update_companies"
    ON companies FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM company_users
            WHERE company_users.company_id = id
            AND company_users.user_id = auth.uid()
            AND company_users.role IN ('owner', 'admin')
        )
    );

-- Delete policy: Only owners can delete their companies
CREATE POLICY "delete_companies"
    ON companies FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM company_users
            WHERE company_users.company_id = id
            AND company_users.user_id = auth.uid()
            AND company_users.role = 'owner'
        )
    );

-- Insert policy: Companies can only be created through the function
CREATE POLICY "insert_companies"
    ON companies FOR INSERT
    WITH CHECK (FALSE);  -- All inserts must go through the create_company_with_owner function

-- Create new simplified policies for company_users

-- View policy: Users can view memberships they can see
CREATE POLICY "view_company_users"
    ON company_users FOR SELECT
    USING (
        user_id = auth.uid()  -- Can see their own memberships
        OR 
        company_id IN (       -- Can see members of companies they own
            SELECT company_id 
            FROM company_users 
            WHERE user_id = auth.uid() 
            AND role = 'owner'
        )
    );

-- Insert policy: Allow function and owners to create memberships
CREATE POLICY "insert_company_users"
    ON company_users FOR INSERT
    WITH CHECK (
        (
            -- Allow the security definer function to create the initial owner
            current_setting('role') = 'postgres'
        ) 
        OR 
        (
            -- Allow existing owners to add new users
            company_id IN (
                SELECT company_id 
                FROM company_users 
                WHERE user_id = auth.uid() 
                AND role = 'owner'
            )
        )
    );

-- Update policy: Only owners can update memberships
CREATE POLICY "update_company_users"
    ON company_users FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id 
            FROM company_users 
            WHERE user_id = auth.uid() 
            AND role = 'owner'
        )
    );

-- Delete policy: Only owners can remove members
CREATE POLICY "delete_company_users"
    ON company_users FOR DELETE
    USING (
        company_id IN (
            SELECT company_id 
            FROM company_users 
            WHERE user_id = auth.uid() 
            AND role = 'owner'
        )
    ); 