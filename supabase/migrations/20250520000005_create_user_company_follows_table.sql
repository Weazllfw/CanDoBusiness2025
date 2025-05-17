DROP TABLE IF EXISTS public.user_company_follows CASCADE;
-- Migration to create the user_company_follows table and set up initial RLS policies

-- 1. Create the user_company_follows table
CREATE TABLE public.user_company_follows (
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, company_id) -- Ensures a user can only follow a company once
);

-- Add comments to table and columns for clarity
COMMENT ON TABLE public.user_company_follows IS 'Tracks users following companies.';
COMMENT ON COLUMN public.user_company_follows.user_id IS 'The user who is following the company.';
COMMENT ON COLUMN public.user_company_follows.company_id IS 'The company being followed by the user.';
COMMENT ON COLUMN public.user_company_follows.created_at IS 'Timestamp of when the follow action occurred.';

-- Create indexes for performance (primary key already creates one for (user_id, company_id))
-- An index on company_id might be useful for quickly finding all followers of a company.
DROP INDEX IF EXISTS idx_user_company_follows_company_id;
CREATE INDEX IF NOT EXISTS idx_user_company_follows_company_id ON public.user_company_follows(company_id);
-- CREATE INDEX idx_user_company_follows_user_id ON public.user_company_follows(user_id); -- Covered by PK

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.user_company_follows ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for user_company_follows

-- Allow authenticated users to read all follow relationships
DROP POLICY IF EXISTS "Allow authenticated users to read follow relationships" ON public.user_company_follows;
CREATE POLICY "Allow authenticated users to read follow relationships"
ON public.user_company_follows
FOR SELECT
TO authenticated
USING (true);

-- Allow users to insert their own follow records (follow a company)
DROP POLICY IF EXISTS "Allow users to follow a company" ON public.user_company_follows;
CREATE POLICY "Allow users to follow a company"
ON public.user_company_follows
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own follow records (unfollow a company)
DROP POLICY IF EXISTS "Allow users to unfollow a company" ON public.user_company_follows;
CREATE POLICY "Allow users to unfollow a company"
ON public.user_company_follows
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Note: Updates to this table are generally not needed; a user either follows or unfollows (deletes the row). 