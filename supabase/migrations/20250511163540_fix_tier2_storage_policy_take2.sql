-- 1. Create the new storage bucket for Tier 2 documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('tier2-verification-documents', 'tier2-verification-documents', FALSE, 5242880, 
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 
    'application/pdf', 
    'application/msword', -- .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', -- .docx
    'text/plain' -- .txt
  ])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. RLS Policies for 'tier2-verification-documents' bucket

-- Drop existing policies first for idempotency.
DROP POLICY IF EXISTS "Admin can read Tier 2 documents" ON storage.objects;
DROP POLICY IF EXISTS "Company owners can upload Tier 2 documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete Tier 2 documents" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete Tier 2 documents" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access to Tier 2 documents" ON storage.objects;

-- Allow admin read access to all files in the bucket
CREATE POLICY "Admin can read Tier 2 documents" 
ON storage.objects FOR SELECT
TO authenticated -- Retaining 'TO authenticated' for admin policies as it's common
USING (
  bucket_id = 'tier2-verification-documents' AND
  internal.is_admin(auth.uid())
);

-- Allow company owners to upload to their specific company folder within the bucket.
-- Path will be like: {company_id}/{filename_with_timestamp_prefix}
-- Explicitly using storage.objects.name and simplified subquery structure
CREATE POLICY "Company owners can upload Tier 2 documents" 
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tier2-verification-documents' AND
  auth.uid() = (
    SELECT owner_id 
    FROM public.companies 
    WHERE id = ((string_to_array(storage.objects.name, '/'))[1])::uuid
  )
);

-- Allow admins to delete any file from the bucket
CREATE POLICY "Admins can delete Tier 2 documents" 
ON storage.objects FOR DELETE
TO authenticated -- Retaining 'TO authenticated' for admin policies
USING (
  bucket_id = 'tier2-verification-documents' AND
  internal.is_admin(auth.uid())
);

-- Allow service_role to delete objects (so SECURITY DEFINER functions can delete)
CREATE POLICY "Service role can delete Tier 2 documents"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'tier2-verification-documents' AND
    auth.role() = 'service_role'
);

-- Grant service_role all access to the bucket for administrative tasks by functions
CREATE POLICY "Service role full access to Tier 2 documents"
ON storage.objects FOR ALL
USING (
    bucket_id = 'tier2-verification-documents' AND
    auth.role() = 'service_role'
)
WITH CHECK (
    bucket_id = 'tier2-verification-documents' AND
    auth.role() = 'service_role'
);

DO $$ BEGIN
  RAISE NOTICE 'Storage bucket tier2-verification-documents created/updated and RLS policies (re)applied.';
END $$; 