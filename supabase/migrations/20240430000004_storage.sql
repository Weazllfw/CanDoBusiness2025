-- Create the storage bucket for company logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to upload company logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to company logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their uploaded logos" ON storage.objects;

-- Set up storage policy to allow authenticated users to upload
CREATE POLICY "Allow authenticated users to upload company logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-logos'
);

-- Set up storage policy to allow public access to read company logos
CREATE POLICY "Allow public access to company logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'company-logos');

-- Set up storage policy to allow authenticated users to delete their uploaded logos
CREATE POLICY "Allow users to delete their uploaded logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-logos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
); 