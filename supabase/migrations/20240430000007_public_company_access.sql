-- Drop existing select policy
DROP POLICY IF EXISTS "companies_select" ON companies;

-- Create new public view for companies
DROP VIEW IF EXISTS public_companies;
CREATE VIEW public_companies AS
SELECT 
    id,
    name,
    trading_name,
    website,
    address->>'city' as city,
    address->>'province' as province,
    industry_tags,
    capability_tags,
    region_tags,
    is_verified,
    verification_badge_url,
    verified_at,
    created_at,
    updated_at
FROM companies;

-- Create public access policy for companies
CREATE POLICY "companies_select"
    ON companies FOR SELECT
    USING (true);  -- Allow all users to see all companies

-- Grant permissions
GRANT SELECT ON public_companies TO anon;
GRANT SELECT ON public_companies TO authenticated; 