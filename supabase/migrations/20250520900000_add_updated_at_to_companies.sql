-- Add updated_at column to public.companies
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- Ensure the updated_at column is correctly populated on existing rows if it's newly added
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'companies'
        AND column_name = 'updated_at'
    ) THEN
        UPDATE public.companies
        SET updated_at = created_at -- Or CURRENT_TIMESTAMP if more appropriate for old records
        WHERE updated_at IS NULL;
    END IF;
END $$;

-- Create or replace the trigger function to handle updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists, then create it
DROP TRIGGER IF EXISTS trigger_companies_updated_at ON public.companies;
CREATE TRIGGER trigger_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON COLUMN public.companies.updated_at IS 'Timestamp of the last update to the company record.';
COMMENT ON TRIGGER trigger_companies_updated_at ON public.companies IS 'Automatically updates the updated_at timestamp on every company row update.'; 