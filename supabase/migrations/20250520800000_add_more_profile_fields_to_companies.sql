-- Add new company profile enhancement fields to public.companies

ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS banner_url TEXT NULL,
ADD COLUMN IF NOT EXISTS year_founded INTEGER NULL,
ADD COLUMN IF NOT EXISTS business_type TEXT NULL,
ADD COLUMN IF NOT EXISTS employee_count TEXT NULL, -- Using TEXT for ranges like "1-10", "11-50"
ADD COLUMN IF NOT EXISTS revenue_range TEXT NULL,  -- Using TEXT for ranges like "$0-$1M"
ADD COLUMN IF NOT EXISTS social_media_links JSONB NULL,
ADD COLUMN IF NOT EXISTS certifications TEXT[] NULL,
ADD COLUMN IF NOT EXISTS tags TEXT[] NULL,
ADD COLUMN IF NOT EXISTS industry TEXT NULL, -- Ensure industry exists, was missing from some earlier iterations of companies table
ADD COLUMN IF NOT EXISTS website TEXT NULL, -- Ensure website exists
ADD COLUMN IF NOT EXISTS description TEXT NULL, -- Ensure description exists
ADD COLUMN IF NOT EXISTS country TEXT NULL DEFAULT 'Canada'; -- Added in Companies.md

-- Update existing NULL values for TEXT fields to empty strings if preferred, or handle in application
-- For JSONB, default could be '{}'
-- For TEXT[], default could be '{}'

COMMENT ON COLUMN public.companies.banner_url IS 'URL for the company banner image.';
COMMENT ON COLUMN public.companies.year_founded IS 'The year the company was founded.';
COMMENT ON COLUMN public.companies.business_type IS 'Type of business (e.g., LLC, Corporation, Sole Proprietorship).';
COMMENT ON COLUMN public.companies.employee_count IS 'Approximate number of employees (e.g., "1-10", "11-50").';
COMMENT ON COLUMN public.companies.revenue_range IS 'Approximate annual revenue range (e.g., "$0-$1M", "$1M-$5M").';
COMMENT ON COLUMN public.companies.social_media_links IS 'JSONB object storing social media profile URLs (e.g., {"linkedin": "url", "twitter": "url"}).';
COMMENT ON COLUMN public.companies.certifications IS 'Array of certifications held by the company.';
COMMENT ON COLUMN public.companies.tags IS 'Array of tags or keywords associated with the company.';
COMMENT ON COLUMN public.companies.industry IS 'The industry sector the company operates in.';
COMMENT ON COLUMN public.companies.website IS 'Official website URL for the company.';
COMMENT ON COLUMN public.companies.description IS 'A brief description of the company.';
COMMENT ON COLUMN public.companies.country IS 'Country where the company is based, defaults to Canada.'; 