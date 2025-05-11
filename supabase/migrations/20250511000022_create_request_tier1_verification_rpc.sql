-- Migration: Create RPC function for users to request Tier 1 company verification

CREATE OR REPLACE FUNCTION public.request_company_tier1_verification(
  p_company_id UUID,
  p_business_number TEXT,
  p_public_presence_links TEXT[],
  p_self_attestation_completed BOOLEAN
)
RETURNS VOID -- Or potentially the updated company row if needed by the frontend
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal -- Ensure 'internal' schema is in search_path if is_admin or similar is used from there
AS $$
DECLARE
  target_company public.companies%ROWTYPE;
BEGIN
  -- Fetch the company to check ownership and current status
  SELECT * INTO target_company FROM public.companies WHERE id = p_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Company with ID % not found.', p_company_id;
  END IF;

  -- Check if the calling user is the owner of the company
  IF target_company.owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'User % is not authorized to request verification for company %.', auth.uid(), p_company_id;
  END IF;

  -- Check if the company is eligible for Tier 1 application
  IF target_company.verification_status <> 'UNVERIFIED' AND target_company.verification_status <> 'TIER1_REJECTED' THEN
     RAISE EXCEPTION 'Company % is not eligible for a new Tier 1 verification application. Current status: %.', target_company.name, target_company.verification_status;
  END IF;

  -- Perform the update
  UPDATE public.companies
  SET
    business_number = p_business_number,
    public_presence_links = p_public_presence_links,
    self_attestation_completed = p_self_attestation_completed,
    verification_status = 'TIER1_PENDING' -- Set to pending
  WHERE
    id = p_company_id;

END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.request_company_tier1_verification(UUID, TEXT, TEXT[], BOOLEAN) TO authenticated;

DO $$ BEGIN
  RAISE NOTICE 'RPC function request_company_tier1_verification created and granted.';
END $$; 