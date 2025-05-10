-- Add index for company lookups
CREATE INDEX companies_name_idx ON companies USING gin(name gin_trgm_ops); 