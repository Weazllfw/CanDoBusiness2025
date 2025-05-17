-- Add Tier 2 process management fields to public.companies

ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS tier2_submission_date TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS tier2_document_type TEXT NULL,
ADD COLUMN IF NOT EXISTS tier2_document_filename TEXT NULL,
ADD COLUMN IF NOT EXISTS tier2_document_storage_path TEXT NULL,
ADD COLUMN IF NOT EXISTS tier2_document_uploaded_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.companies.tier2_submission_date IS 'Timestamp when Tier 2 verification was initially submitted by the user.';
COMMENT ON COLUMN public.companies.tier2_document_type IS 'The type of document submitted for Tier 2 review (e.g., ''articles_of_incorporation'', ''photo_id'').';
COMMENT ON COLUMN public.companies.tier2_document_filename IS 'Original filename of the document uploaded for Tier 2 verification.';
COMMENT ON COLUMN public.companies.tier2_document_storage_path IS 'Storage path of the document currently under review for Tier 2.';
COMMENT ON COLUMN public.companies.tier2_document_uploaded_at IS 'Timestamp when the Tier 2 document was uploaded for review.'; 