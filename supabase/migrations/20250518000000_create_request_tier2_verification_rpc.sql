-- Migration: Create RPC function for users to request Tier 2 company verification

CREATE OR REPLACE FUNCTION public.request_company_tier2_verification(
  p_company_id UUID,
  p_tier2_document_type TEXT,
  p_tier2_document_filename TEXT,
  p_tier2_document_storage_path TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
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
    RAISE EXCEPTION 'User % is not authorized to request Tier 2 verification for company %.', auth.uid(), p_company_id;
  END IF;

  -- Check if the company is eligible for Tier 2 application
  IF target_company.verification_status <> 'TIER1_VERIFIED' THEN
     RAISE EXCEPTION 'Company % is not eligible for Tier 2 verification. Company must be Tier 1 Verified. Current status: %.', target_company.name, target_company.verification_status;
  END IF;

  -- Validate provided document details (basic checks)
  IF p_tier2_document_type IS NULL OR trim(p_tier2_document_type) = '' THEN
    RAISE EXCEPTION 'Tier 2 document type must be provided.';
  END IF;
  IF p_tier2_document_filename IS NULL OR trim(p_tier2_document_filename) = '' THEN
    RAISE EXCEPTION 'Tier 2 document filename must be provided.';
  END IF;
  IF p_tier2_document_storage_path IS NULL OR trim(p_tier2_document_storage_path) = '' THEN
    RAISE EXCEPTION 'Tier 2 document storage path must be provided.';
  END IF;

  -- Perform the update to request Tier 2 verification and store document details
  UPDATE public.companies
  SET
    verification_status = 'TIER2_PENDING', -- Set to Tier 2 pending
    tier2_document_type = p_tier2_document_type,
    tier2_document_filename = p_tier2_document_filename,
    tier2_document_storage_path = p_tier2_document_storage_path,
    tier2_document_uploaded_at = timezone('utc'::text, now())
  WHERE
    id = p_company_id;

  RAISE NOTICE 'User % has successfully requested Tier 2 verification for company % (ID: %). Document: %, Path: %. Status set to TIER2_PENDING.', 
    auth.uid(), target_company.name, p_company_id, p_tier2_document_filename, p_tier2_document_storage_path;

END;
$$;

-- Grant execute permission to authenticated users
-- Need to update the grant for the new function signature
DROP FUNCTION IF EXISTS public.request_company_tier2_verification(UUID); -- Drop old one if signature changed
GRANT EXECUTE ON FUNCTION public.request_company_tier2_verification(UUID, TEXT, TEXT, TEXT) TO authenticated;

DO $$ BEGIN
  RAISE NOTICE 'RPC function request_company_tier2_verification updated to accept document details and granted.';
END $$; 