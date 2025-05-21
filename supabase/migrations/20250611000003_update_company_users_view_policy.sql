-- Migration: Update RLS policy for viewing company_users to use helper function
-- This fixes a potential recursion issue and makes the policy clearer.

-- Drop the old policy that might have caused recursion or was less efficient
DROP POLICY IF EXISTS "Company admins can view their company users" ON public.company_users;

-- Create the new policy using the public.check_if_user_is_company_admin helper function
CREATE POLICY "Company admins can view their company users"
ON public.company_users FOR SELECT
TO authenticated
USING (
    public.check_if_user_is_company_admin(public.company_users.company_id, auth.uid())
);

DO $$ BEGIN
  RAISE NOTICE 'RLS policy "Company admins can view their company users" on public.company_users updated to use helper function.';
END $$; 