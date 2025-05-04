-- Fix infinite recursion in company_users policies
CREATE OR REPLACE FUNCTION is_company_admin_or_owner(company_id uuid, user_id uuid)
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
        AND company_users.role IN ('admin', 'owner')
    );
$$;

-- Drop and recreate the problematic policy
DROP POLICY IF EXISTS "Admins/Owners can view other memberships in their companies" ON company_users;

CREATE POLICY "Admins/Owners can view other memberships in their companies"
    ON company_users FOR SELECT
    USING (is_company_admin_or_owner(company_id, auth.uid()));

-- Grant execute permission on the new function
GRANT EXECUTE ON FUNCTION is_company_admin_or_owner TO authenticated;

-- Add a basic policy for viewing company_users
CREATE POLICY "Users can view companies they are members of"
    ON company_users FOR SELECT
    USING (is_company_member(company_id, auth.uid())); 