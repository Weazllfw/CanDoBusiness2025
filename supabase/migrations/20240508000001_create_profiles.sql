DROP TABLE IF EXISTS public.profiles CASCADE;
CREATE TABLE public.profiles (
  id uuid primary key references auth.users(id) ON DELETE CASCADE,
  name text,
  email text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Add indexes
DROP INDEX IF EXISTS profiles_email_idx;
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
DROP INDEX IF EXISTS profiles_name_idx;
CREATE INDEX IF NOT EXISTS profiles_name_idx ON public.profiles USING gin(name public.gin_trgm_ops);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
CREATE POLICY "Users can delete their own profile"
    ON public.profiles FOR DELETE
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Profile insert only by owner" ON public.profiles;
CREATE POLICY "Profile insert only by owner"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id); 