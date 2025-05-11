-- Create internal schema for helper functions and triggers
CREATE SCHEMA IF NOT EXISTS internal;
GRANT USAGE ON SCHEMA internal TO authenticated, service_role;

-- Admin check function
CREATE OR REPLACE FUNCTION internal.is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- To check profiles table if it has restrictive RLS
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_user_id AND email = 'rmarshall@itmarshall.net'
  );
END;
$$;
GRANT EXECUTE ON FUNCTION internal.is_admin(uuid) TO authenticated, service_role;

-- Create a view that exposes company data publicly but hides admin_notes
CREATE OR REPLACE VIEW public.companies_view AS
SELECT
  id,
  created_at,
  name,
  description,
  website,
  location,
  industry,
  owner_id,
  avatar_url,
  verification_status -- admin_notes is excluded
FROM
  public.companies;

-- Modify get_user_companies to return data from the view or with explicit columns
-- Option 1: Return SETOF public.companies_view and SELECT * from it.
-- For this to work, owner_id needs to be in the view, which it is.
DROP FUNCTION IF EXISTS public.get_user_companies(uuid); -- Drop old one first
CREATE OR REPLACE FUNCTION public.get_user_companies(p_user_id UUID)
RETURNS SETOF public.companies_view -- Return type is now the view
LANGUAGE sql
SECURITY DEFINER -- Keep as SECURITY DEFINER if it needs to bypass RLS for specific joins, but ensure it's safe.
                -- If it's just filtering by owner_id, SECURITY INVOKER with proper RLS on the view/table is also an option.
                -- Sticking to SECURITY DEFINER as per original, assuming there might be a reason.
AS $$
  SELECT *
  FROM public.companies_view
  WHERE owner_id = p_user_id;
$$;
GRANT EXECUTE ON FUNCTION public.get_user_companies(uuid) TO authenticated, service_role;


-- RLS for public.companies table
-- Drop existing policies first to avoid conflicts (use actual names if different)
-- From initial_schema: "Companies are viewable by everyone", "Users can create their own companies", "Users can update their own companies", "Users can delete their own companies"
DROP POLICY IF EXISTS "Companies are viewable by everyone" ON public.companies;
DROP POLICY IF EXISTS "Users can create their own companies" ON public.companies;
DROP POLICY IF EXISTS "Users can update their own companies" ON public.companies;
DROP POLICY IF EXISTS "Users can delete their own companies" ON public.companies;
-- Add any other company specific RLS policies here if they exist from other migrations

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies FORCE ROW LEVEL SECURITY; -- Recommended

-- Allows authenticated users to see company rows. Column filtering achieved by querying public.companies_view.
CREATE POLICY "Authenticated users can view company data via view" ON public.companies
  FOR SELECT
  TO authenticated
  USING (true);

-- Owners can insert their companies
CREATE POLICY "Owners can insert their companies" ON public.companies
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Owners can update their companies (trigger will protect specific fields)
-- Original update policy from initial_schema.sql was: USING (auth.uid() = owner_id);
-- It should have a WITH CHECK clause as well.
CREATE POLICY "Owners can update their companies" ON public.companies
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Owners can delete their companies
CREATE POLICY "Owners can delete their companies" ON public.companies
  FOR DELETE
  USING (auth.uid() = owner_id);

-- Admins can select all data directly from the table
CREATE POLICY "Admins can select all company data" ON public.companies
  FOR SELECT
  USING (internal.is_admin(auth.uid())); -- Allows admin to bypass the 'view-only' for general users

-- Admins can update any company, including verification_status and admin_notes
CREATE POLICY "Admins can update any company" ON public.companies
  FOR UPDATE
  USING (internal.is_admin(auth.uid()))
  WITH CHECK (internal.is_admin(auth.uid()));


-- Trigger to prevent owners from updating verification_status and admin_notes
CREATE OR REPLACE FUNCTION internal.prevent_owner_update_restricted_company_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If the current_user (effective user for permission checking) is a known privileged role,
  -- assume this is a SECURITY DEFINER function (like our RPC) performing the update.
  IF current_user IN ('postgres', 'supabase_admin', 'admin', 'service_role') THEN
    RETURN NEW; -- Allow the update
  END IF;

  -- If not a privileged current_user, proceed with the original checks based on auth.uid()
  -- This auth.uid() refers to the user from the JWT (the original caller).
  IF OLD.owner_id = auth.uid() AND NOT internal.is_admin(auth.uid()) THEN
    IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
      RAISE EXCEPTION 'As a company owner, you cannot directly change the verification_status. Please contact support if changes are needed.';
    END IF;
    IF NEW.admin_notes IS DISTINCT FROM OLD.admin_notes THEN
      RAISE EXCEPTION 'As a company owner, you cannot change admin_notes.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER before_company_update_check_restricted_fields
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION internal.prevent_owner_update_restricted_company_fields();

DO $$ BEGIN
  RAISE NOTICE 'Company RLS policies updated, companies_view created, get_user_companies modified, and field update trigger added.';
END $$; 