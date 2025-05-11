-- Migration: Setup Supabase Storage for Company Logos

-- 1. Create the Storage Bucket for Company Logos
-- This assumes the bucket does not already exist. 
-- If it might, you could add IF NOT EXISTS logic if your Supabase CLI/version supports it for storage inserts,
-- or handle it by ensuring this migration runs once.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('company-logos', 'company-logos', TRUE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET -- In case it ran before and failed mid-way or for idempotency
  public = TRUE,
  file_size_limit = 5242880, -- 5MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- 2. RLS Policies for 'company-logos' bucket
-- Assumes files will be uploaded with a path structure like: {company_id}/{filename_with_extension}
-- where {company_id} is the UUID of the company.

-- Drop existing policies first for idempotency
DROP POLICY IF EXISTS "Public read access for company logos" ON storage.objects;
DROP POLICY IF EXISTS "Company owners can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Company owners can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Company owners can delete logos" ON storage.objects;

-- Allow public read access to all files in the bucket
CREATE POLICY "Public read access for company logos" 
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

-- Allow company owners to insert (upload) logos for their own companies
-- The path is expected to be company_id/filename.ext
-- (storage.foldername(name))[1] extracts the first part of the path (the company_id folder)
CREATE POLICY "Company owners can upload logos" 
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos' AND
  auth.uid() = (SELECT owner_id FROM public.companies WHERE id = ((string_to_array(storage.objects.name, '/'))[1])::uuid)
);

-- Allow company owners to update logos for their own companies
CREATE POLICY "Company owners can update logos" 
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'company-logos' AND
  auth.uid() = (SELECT owner_id FROM public.companies WHERE id = ((string_to_array(storage.objects.name, '/'))[1])::uuid)
);

-- Allow company owners to delete logos for their own companies
CREATE POLICY "Company owners can delete logos" 
ON storage.objects FOR DELETE
USING (
  bucket_id = 'company-logos' AND
  auth.uid() = (SELECT owner_id FROM public.companies WHERE id = ((string_to_array(storage.objects.name, '/'))[1])::uuid)
);

DO $$ BEGIN
  RAISE NOTICE 'Supabase Storage bucket "company-logos" created and RLS policies (re)applied idempotently.';
END $$; 