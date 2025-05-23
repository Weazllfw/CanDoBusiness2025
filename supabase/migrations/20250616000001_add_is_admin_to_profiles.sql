ALTER TABLE public.profiles
ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.is_admin IS 'Flag to indicate if a user has administrative privileges.';

-- Optional: Grant this new admin status to your existing admin user(s)
-- Replace 'your_admin_user_id_1' with the actual user ID of an admin.
-- You can add more lines if you have multiple admins to set up initially.
-- Example:
-- UPDATE public.profiles SET is_admin = TRUE WHERE id = 'your_admin_user_id_1';
-- UPDATE public.profiles SET is_admin = TRUE WHERE email = 'rmarshall@itmarshall.net'; -- If you prefer to use email 