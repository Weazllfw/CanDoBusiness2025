-- Drop existing policies
DROP POLICY IF EXISTS "Users can view members of their companies" ON company_users;
DROP POLICY IF EXISTS "Only owners can manage company users" ON company_users;

-- Create new non-recursive policies
CREATE POLICY "Users can view their own company memberships"
    ON company_users FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can view company members where they are owners"
    ON company_users FOR SELECT
    USING (
        company_id IN (
            SELECT company_id 
            FROM company_users 
            WHERE user_id = auth.uid() 
            AND role = 'owner'
        )
    );

CREATE POLICY "Owners can insert new company users"
    ON company_users FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id 
            FROM company_users 
            WHERE user_id = auth.uid() 
            AND role = 'owner'
        )
    );

CREATE POLICY "Owners can update company users"
    ON company_users FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id 
            FROM company_users 
            WHERE user_id = auth.uid() 
            AND role = 'owner'
        )
    );

CREATE POLICY "Owners can delete company users"
    ON company_users FOR DELETE
    USING (
        company_id IN (
            SELECT company_id 
            FROM company_users 
            WHERE user_id = auth.uid() 
            AND role = 'owner'
        )
    );

-- Add policy for initial company creation
CREATE POLICY "Users can create their own initial company membership"
    ON company_users FOR INSERT
    WITH CHECK (
        user_id = auth.uid() 
        AND role = 'owner' 
        AND NOT EXISTS (
            SELECT 1 
            FROM company_users 
            WHERE user_id = auth.uid()
        )
    ); 