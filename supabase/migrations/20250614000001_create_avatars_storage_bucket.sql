-- Migration: Create avatars storage bucket and RLS policies

BEGIN;

-- 1. Create the avatars bucket if it doesn't exist
-- We set public to true to allow easy public URL access via getPublicUrl()
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES ('avatars', 'avatars', true, ARRAY['image/jpeg','image/png','image/gif'], 5242880) -- 5MB limit, adjust as needed
ON CONFLICT (id) DO NOTHING;

-- 2. RLS Policies for storage.objects in the 'avatars' bucket

-- Policy: Allow public read access for objects in the avatars bucket.
-- This is somewhat redundant if the bucket is public, but good for explicit control.
DROP POLICY IF EXISTS "Public read access for avatars" ON storage.objects;
CREATE POLICY "Public read access for avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

-- Policy: Authenticated users can upload their own avatars.
-- Path is expected to be: <user_id>/<filename>
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
CREATE POLICY "Users can upload their own avatars"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'avatars' AND
        auth.uid() = ((string_to_array(name, '/'))[1])::uuid
    );

-- Policy: Authenticated users can update their own avatars.
-- Necessary for the upsert:true functionality.
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
CREATE POLICY "Users can update their own avatars"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
        bucket_id = 'avatars' AND
        auth.uid() = ((string_to_array(name, '/'))[1])::uuid
    )
    WITH CHECK (
        bucket_id = 'avatars' AND
        auth.uid() = ((string_to_array(name, '/'))[1])::uuid
    );

-- Policy: Authenticated users can delete their own avatars.
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
CREATE POLICY "Users can delete their own avatars"
    ON storage.objects FOR DELETE TO authenticated
    USING (
        bucket_id = 'avatars' AND
        auth.uid() = ((string_to_array(name, '/'))[1])::uuid
    );

COMMIT;

DO $$ BEGIN
  RAISE NOTICE 'Avatars storage bucket and RLS policies created/updated.';
END $$; 