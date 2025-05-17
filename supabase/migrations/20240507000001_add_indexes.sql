-- Add index for company lookups
DROP INDEX IF EXISTS companies_name_idx;
CREATE INDEX IF NOT EXISTS companies_name_idx ON public.companies USING gin(name public.gin_trgm_ops); 