-- Corrected Company users policies

-- Drop existing policies first (Important!)
DROP POLICY IF EXISTS "Users can view members of their companies" ON company_users;
DROP POLICY IF EXISTS "Only owners can manage company users" ON company_users;

-- Users can view their own membership record
CREATE POLICY "Users can view their own membership"
    ON company_users FOR SELECT
    USING (auth.uid() = user_id);

-- Users can view memberships of companies they are an admin/owner of
CREATE POLICY "Admins/Owners can view other memberships in their companies"
    ON company_users FOR SELECT
    USING (
      company_id IN (
        SELECT cu.company_id
        FROM company_users cu
        WHERE cu.user_id = auth.uid() AND cu.role IN ('admin', 'owner')
      )
    );

-- Owners can insert new members into their companies
CREATE POLICY "Owners can add members to their company"
    ON company_users FOR INSERT
    WITH CHECK (
      company_id IN (
        SELECT cu.company_id
        FROM company_users cu
        WHERE cu.user_id = auth.uid() AND cu.role = 'owner'
      )
    );

-- Owners can update/delete members in their companies (except changing their own owner role or deleting themselves)
CREATE POLICY "Owners can manage members in their company"
    ON company_users FOR UPDATE, DELETE
    USING (
      company_id IN (
        SELECT cu.company_id
        FROM company_users cu
        WHERE cu.user_id = auth.uid() AND cu.role = 'owner'
      )
    )
    -- Optional: Prevent owners from easily removing themselves or changing their own role
    -- WITH CHECK (auth.uid() != user_id); -- Uncomment if needed
    ;