-- Migration to create the post_media storage bucket and set up RLS policies

-- 1. Create the post_media bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('post_media', 'post_media', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']) -- CHANGED public: false to public: true
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 5242880, allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']; -- Ensure it's updated if it already exists

-- Note: Setting public = true here. Access control for objects (like ensuring only owners can upload to specific paths
-- or that only objects in a 'public/' subfolder are readable) is still managed by RLS policies on storage.objects.

-- 2. Enable Row Level Security for storage.objects if not already (globally)
-- This is usually enabled by default, but ensure it for explicitness if needed.
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; -- This might cause error if already enabled.
-- It's generally better to assume it is enabled as per Supabase defaults.

-- 3. RLS Policies for objects in the 'post_media' bucket

-- Allow authenticated users to upload files to their designated paths within 'post_media'
DROP POLICY IF EXISTS "Allow authenticated upload to own post_media folder" ON storage.objects;
CREATE POLICY "Allow authenticated upload to own post_media folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'post_media' AND
  name LIKE 'public/' || auth.uid() || '%' -- Path must start with 'public/' followed by the user's ID
);

-- Allow public read access to files under the 'public/' path within 'post_media'
-- This policy is crucial if the bucket is public:true but you still want to restrict which objects are readable.
DROP POLICY IF EXISTS "Allow public read of public post_media" ON storage.objects;
CREATE POLICY "Allow public read of public post_media"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'post_media' AND
  name LIKE 'public/%' -- Only objects in a path starting with 'public/' are readable
);

-- Optional: Allow authenticated users to delete their own uploaded files from 'post_media'
DROP POLICY IF EXISTS "Allow authenticated delete of own post_media" ON storage.objects;
CREATE POLICY "Allow authenticated delete of own post_media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'post_media' AND
  name LIKE 'public/' || auth.uid() || '%' -- User can only delete files in their path
);

-- Note: Update policies might be needed if you ever intend to allow overwriting/updating files directly via storage.
-- Current frontend logic uses upsert:false, meaning re-uploading the same path would error.

COMMENT ON POLICY "Allow authenticated upload to own post_media folder" ON storage.objects 
IS 'Authenticated users can upload files to the post_media bucket if the path starts with public/their_user_id.';

COMMENT ON POLICY "Allow public read of public post_media" ON storage.objects 
IS 'Anyone can read files from the post_media bucket if the object path starts with public/.';

COMMENT ON POLICY "Allow authenticated delete of own post_media" ON storage.objects
IS 'Authenticated users can delete files they own (path starts with public/their_user_id) from the post_media bucket.'; 