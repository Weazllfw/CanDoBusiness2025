-- Migration: create_company_users_table
-- Description: Creates a table to link users to companies with specific roles.

-- 1. Create company_role_enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_role_enum') THEN
        CREATE TYPE public.company_role_enum AS ENUM (
            'OWNER',    -- Typically the creator, full permissions
            'ADMIN',    -- Administrative privileges
            'MEMBER',   -- General member, fewer permissions
            'VIEWER'    -- Read-only access if needed
        );
    END IF;
END$$;

-- 2. Create company_users table
CREATE TABLE IF NOT EXISTS public.company_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role public.company_role_enum NOT NULL DEFAULT 'MEMBER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT company_users_unique_user_company UNIQUE (user_id, company_id)
);

-- Automatically set updated_at on update
CREATE OR REPLACE FUNCTION internal.set_updated_at_on_company_users()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_updated_at_on_company_users ON public.company_users;
CREATE TRIGGER trigger_set_updated_at_on_company_users
BEFORE UPDATE ON public.company_users
FOR EACH ROW
EXECUTE FUNCTION internal.set_updated_at_on_company_users();

-- 3. Add Indexes
CREATE INDEX IF NOT EXISTS idx_company_users_company_id ON public.company_users(company_id);
CREATE INDEX IF NOT EXISTS idx_company_users_user_id ON public.company_users(user_id);
CREATE INDEX IF NOT EXISTS idx_company_users_role ON public.company_users(role);

-- 4. Enable RLS
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for company_users

-- Company owners/admins can view all users associated with their company.
DROP POLICY IF EXISTS "Company admins can view their company users" ON public.company_users;
CREATE POLICY "Company admins can view their company users"
ON public.company_users FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.company_users cu_admin
        WHERE cu_admin.company_id = public.company_users.company_id
          AND cu_admin.user_id = auth.uid()
          AND cu_admin.role IN ('OWNER', 'ADMIN')
    )
);

-- Users can view their own company memberships.
DROP POLICY IF EXISTS "Users can view their own company memberships" ON public.company_users;
CREATE POLICY "Users can view their own company memberships"
ON public.company_users FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Company owners/admins can add users to their company.
DROP POLICY IF EXISTS "Company admins can add users to their company" ON public.company_users;
CREATE POLICY "Company admins can add users to their company"
ON public.company_users FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.company_users cu_admin
        WHERE cu_admin.company_id = public.company_users.company_id
          AND cu_admin.user_id = auth.uid()
          AND cu_admin.role IN ('OWNER', 'ADMIN')
    )
    -- Prevent self-re-add with different role through this policy; updates should handle role changes.
    AND NOT EXISTS (
        SELECT 1 FROM public.company_users existing_cu
        WHERE existing_cu.company_id = public.company_users.company_id
          AND existing_cu.user_id = public.company_users.user_id
    )
);

-- Company owners/admins can update roles of users in their company (or users can remove themselves).
-- Owners cannot have their role changed by other admins to prevent lockouts.
-- Users can remove themselves from a company (delete their own company_users record).
DROP POLICY IF EXISTS "Company admins can update/remove users in their company" ON public.company_users;
CREATE POLICY "Company admins can update/remove users in their company"
ON public.company_users FOR UPDATE -- For role changes
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.company_users cu_admin
        WHERE cu_admin.company_id = public.company_users.company_id -- cu_admin is an admin of the company to which the row (public.company_users) belongs
          AND cu_admin.user_id = auth.uid()
          AND cu_admin.role IN ('OWNER', 'ADMIN')
    )
)
-- WITH CHECK clause removed, its logic will be moved to a trigger.
;

DROP POLICY IF EXISTS "Users can remove themselves from a company" ON public.company_users;
CREATE POLICY "Users can remove themselves from a company"
ON public.company_users FOR DELETE
TO authenticated
USING (
    user_id = auth.uid()
    AND role <> 'OWNER' -- Owners cannot simply leave; they must transfer ownership or delete company.
);

-- New Trigger function to validate company user role updates
CREATE OR REPLACE FUNCTION internal.validate_company_user_role_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Important if it needs to query other tables with elevated rights, but for company_users itself, invoker might be ok.
                 -- Let's use DEFINER to be safe for the COUNT query.
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_is_demoting_other_owner BOOLEAN;
    v_is_last_owner_demoting_self BOOLEAN;
    v_other_owner_count INTEGER;
BEGIN
    -- Only proceed if the role is actually being changed.
    IF NEW.role = OLD.role THEN
        RETURN NEW; -- No role change, allow.
    END IF;

    -- Scenario 1: An admin (v_actor_id) is trying to change the role of a different user (OLD.user_id)
    --             from OWNER to something else.
    v_is_demoting_other_owner := (
        v_actor_id <> OLD.user_id AND 
        OLD.role = 'OWNER' AND      
        NEW.role <> 'OWNER'             
    );

    -- Scenario 2: An OWNER (OLD.user_id = v_actor_id) is trying to change their own role 
    --             from OWNER to something else, AND they are the last Owner of that company.
    IF (v_actor_id = OLD.user_id AND OLD.role = 'OWNER' AND NEW.role <> 'OWNER') THEN
        SELECT COUNT(*) INTO v_other_owner_count
        FROM public.company_users cu 
        WHERE cu.company_id = OLD.company_id 
          AND cu.role = 'OWNER' 
          AND cu.user_id <> OLD.user_id; -- Count *other* owners
        
        v_is_last_owner_demoting_self := (v_other_owner_count = 0);
    ELSE
        v_is_last_owner_demoting_self := FALSE;
    END IF;

    IF v_is_demoting_other_owner THEN
        RAISE EXCEPTION 'Admins cannot demote an OWNER of a company.';
    END IF;

    IF v_is_last_owner_demoting_self THEN
        RAISE EXCEPTION 'An OWNER cannot demote themselves if they are the last OWNER of the company. Transfer ownership first.';
    END IF;

    RETURN NEW; -- If no restricted scenario is met, allow the update.
END;
$$;

DROP TRIGGER IF EXISTS trigger_validate_company_user_role_update ON public.company_users;
CREATE TRIGGER trigger_validate_company_user_role_update
BEFORE UPDATE OF role ON public.company_users -- Only run if `role` column is part of the UPDATE
FOR EACH ROW
EXECUTE FUNCTION internal.validate_company_user_role_update();

-- When a company is created, its owner_id from `companies` table should get an 'OWNER' role in `company_users`.
-- This needs a trigger on `companies` table AFTER INSERT.
CREATE OR REPLACE FUNCTION internal.assign_company_owner_role()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.company_users (company_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'OWNER');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- SECURITY DEFINER to insert into company_users

DROP TRIGGER IF EXISTS trigger_assign_company_owner_role ON public.companies;
CREATE TRIGGER trigger_assign_company_owner_role
AFTER INSERT ON public.companies
FOR EACH ROW
EXECUTE FUNCTION internal.assign_company_owner_role();

-- 6. Comments
COMMENT ON TABLE public.company_users IS 'Maps users to companies with specific roles (e.g., OWNER, ADMIN, MEMBER).';
COMMENT ON COLUMN public.company_users.role IS 'Role of the user within the company.'; 