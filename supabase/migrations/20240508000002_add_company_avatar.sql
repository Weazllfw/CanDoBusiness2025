-- Add avatar_url column to companies table
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS avatar_url TEXT; 