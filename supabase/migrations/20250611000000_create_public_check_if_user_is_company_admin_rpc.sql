CREATE OR REPLACE FUNCTION public.check_if_user_is_company_admin(
  p_user_id_to_check UUID,
  p_target_company_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Ensures it can call the internal function
SET search_path = public, internal -- Allows it to find internal.is_company_admin
AS $$
BEGIN
  -- This public wrapper calls the existing internal function.
  RETURN internal.is_company_admin(p_user_id_to_check, p_target_company_id);
END;
$$;

-- Grant execute on this new public function to authenticated users
GRANT EXECUTE ON FUNCTION public.check_if_user_is_company_admin(UUID, UUID) TO authenticated;

DO $$ BEGIN
  RAISE NOTICE 'Public wrapper function public.check_if_user_is_company_admin created.';
END $$; 