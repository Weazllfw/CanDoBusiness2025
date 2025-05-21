-- Enable RLS for the table if not already enabled (though it should be from table creation)
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

-- Drop policy if it already exists (for idempotency during development/testing)
DROP POLICY IF EXISTS "Company admins can remove users from their company" ON public.company_users;

-- Create the new RLS policy for DELETE
CREATE POLICY "Company admins can remove users from their company"
ON public.company_users
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.company_users cu_admin
    WHERE cu_admin.company_id = public.company_users.company_id
      AND cu_admin.user_id = auth.uid()
      AND cu_admin.role IN ('OWNER', 'ADMIN')
  )
  AND public.company_users.user_id <> auth.uid() -- Admin cannot use this policy to remove themselves
  AND public.company_users.role <> 'OWNER'       -- Policy does not allow removing an OWNER
);

COMMENT ON POLICY "Company admins can remove users from their company" ON public.company_users 
IS 'Allows company OWNERS or ADMINS to remove other non-OWNER users from their company.';

-- Reminder: The trigger `internal.validate_company_user_role_update` handles:
-- 1. Preventing an ADMIN from demoting an OWNER.
-- 2. Preventing the last OWNER from demoting themselves.
-- Additional checks might be needed if an OWNER could be removed by other means or if the last owner check
-- needs to be more directly tied to DELETE operations if an OWNER could somehow be targeted by a future DELETE policy.
-- For this specific policy, `public.company_users.role <> 'OWNER'` prevents owners from being removed by it. 