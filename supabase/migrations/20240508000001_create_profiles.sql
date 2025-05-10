create table public.profiles (
  id uuid primary key references auth.users(id),
  name text,
  email text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Add indexes
CREATE INDEX profiles_email_idx ON profiles(email);
CREATE INDEX profiles_name_idx ON profiles USING gin(name gin_trgm_ops);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Profiles are viewable by everyone"
    ON profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can delete their own profile"
    ON profiles FOR DELETE
    USING (auth.uid() = id);

CREATE POLICY "Profile insert only by owner"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id); 