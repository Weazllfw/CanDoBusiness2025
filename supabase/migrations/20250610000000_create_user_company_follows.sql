-- Migration: Create user_company_follows table and follow/unfollow RPCs

-- 1. Table
CREATE TABLE IF NOT EXISTS public.user_company_follows (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, company_id)
);

-- 2. RLS
ALTER TABLE public.user_company_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their follows" ON public.user_company_follows;
CREATE POLICY "Users can view their follows" ON public.user_company_follows
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can follow companies" ON public.user_company_follows;
CREATE POLICY "Users can follow companies" ON public.user_company_follows
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unfollow companies" ON public.user_company_follows;
CREATE POLICY "Users can unfollow companies" ON public.user_company_follows
  FOR DELETE USING (auth.uid() = user_id);

-- 3. RPCs
-- Follow company
CREATE OR REPLACE FUNCTION public.follow_company(p_company_id uuid)
RETURNS public.user_company_follows
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_row public.user_company_follows;
BEGIN
    INSERT INTO public.user_company_follows (user_id, company_id)
    VALUES (v_user_id, p_company_id)
    ON CONFLICT (user_id, company_id) DO NOTHING
    RETURNING * INTO v_row;
    RETURN v_row;
END;
$$;

-- Unfollow company
CREATE OR REPLACE FUNCTION public.unfollow_company(p_company_id uuid)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid := auth.uid();
BEGIN
    DELETE FROM public.user_company_follows
    WHERE user_id = v_user_id AND company_id = p_company_id;
END;
$$;

-- Get follow status
CREATE OR REPLACE FUNCTION public.get_company_follow_status(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_company_follows
        WHERE user_id = auth.uid() AND company_id = p_company_id
    );
$$;

-- Get all followed companies for a user
CREATE OR REPLACE FUNCTION public.get_followed_companies()
RETURNS SETOF public.user_company_follows
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT * FROM public.user_company_follows WHERE user_id = auth.uid();
$$; 