-- Add new columns to RFQs table
ALTER TABLE public.rfqs
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS required_certifications TEXT[],
ADD COLUMN IF NOT EXISTS attachments TEXT[],
ADD COLUMN IF NOT EXISTS preferred_delivery_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'invited')),
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS requirements JSONB,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Create RFQ templates table
DROP TABLE IF EXISTS public.rfq_templates CASCADE;
CREATE TABLE public.rfq_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    required_certifications TEXT[],
    requirements JSONB,
    is_public BOOLEAN DEFAULT false
);

-- Create RFQ invitations table
DROP TABLE IF EXISTS public.rfq_invitations CASCADE;
CREATE TABLE public.rfq_invitations (
    rfq_id UUID REFERENCES public.rfqs(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    response_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (rfq_id, company_id)
);

-- Create quotes table
DROP TABLE IF EXISTS public.quotes CASCADE;
CREATE TABLE public.quotes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    rfq_id UUID NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    amount DECIMAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    delivery_time TEXT,
    validity_period INTERVAL,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'accepted', 'rejected', 'withdrawn')),
    notes TEXT,
    attachments TEXT[],
    terms_and_conditions TEXT,
    technical_specifications JSONB,
    UNIQUE (rfq_id, company_id)
);

-- Create quote revisions table for tracking changes
DROP TABLE IF EXISTS public.quote_revisions CASCADE;
CREATE TABLE public.quote_revisions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    amount DECIMAL NOT NULL,
    currency TEXT NOT NULL,
    delivery_time TEXT,
    notes TEXT,
    revision_number INTEGER NOT NULL,
    changes_description TEXT
);

-- Add indexes for better performance
DROP INDEX IF EXISTS idx_rfqs_company_id_status;
CREATE INDEX IF NOT EXISTS idx_rfqs_company_id_status ON public.rfqs(company_id, status);
DROP INDEX IF EXISTS idx_rfqs_category;
CREATE INDEX IF NOT EXISTS idx_rfqs_category ON public.rfqs(category);
DROP INDEX IF EXISTS idx_rfqs_deadline;
CREATE INDEX IF NOT EXISTS idx_rfqs_deadline ON public.rfqs(deadline);
DROP INDEX IF EXISTS idx_quotes_rfq_id;
CREATE INDEX IF NOT EXISTS idx_quotes_rfq_id ON public.quotes(rfq_id);
DROP INDEX IF EXISTS idx_quotes_company_id;
CREATE INDEX IF NOT EXISTS idx_quotes_company_id ON public.quotes(company_id);
DROP INDEX IF EXISTS idx_quote_revisions_quote_id;
CREATE INDEX IF NOT EXISTS idx_quote_revisions_quote_id ON public.quote_revisions(quote_id);

-- Add RLS policies
ALTER TABLE public.rfq_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_revisions ENABLE ROW LEVEL SECURITY;

-- RFQ template policies
DROP POLICY IF EXISTS "RFQ templates are viewable by owner and if public" ON public.rfq_templates;
CREATE POLICY "RFQ templates are viewable by owner and if public"
    ON public.rfq_templates FOR SELECT
    USING (
        is_public OR 
        EXISTS (
            SELECT 1 FROM public.companies
            WHERE public.companies.id = public.rfq_templates.company_id
            AND public.companies.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create RFQ templates for their companies" ON public.rfq_templates;
CREATE POLICY "Users can create RFQ templates for their companies"
    ON public.rfq_templates FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.companies
        WHERE public.companies.id = public.rfq_templates.company_id
        AND public.companies.owner_id = auth.uid()
    ));

-- RFQ invitation policies
DROP POLICY IF EXISTS "Companies can view their RFQ invitations" ON public.rfq_invitations;
CREATE POLICY "Companies can view their RFQ invitations"
    ON public.rfq_invitations FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.companies
        WHERE public.companies.id = public.rfq_invitations.company_id
        AND public.companies.owner_id = auth.uid()
    ));

-- Quote policies
DROP POLICY IF EXISTS "Quotes are viewable by RFQ owner and quote creator" ON public.quotes;
CREATE POLICY "Quotes are viewable by RFQ owner and quote creator"
    ON public.quotes FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.companies
        WHERE (
            public.companies.owner_id = auth.uid() AND
            (
                public.companies.id = public.quotes.company_id OR
                public.companies.id = (SELECT company_id FROM public.rfqs WHERE id = public.quotes.rfq_id)
            )
        )
    ));

DROP POLICY IF EXISTS "Companies can create quotes" ON public.quotes;
CREATE POLICY "Companies can create quotes"
    ON public.quotes FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.companies
        WHERE public.companies.id = public.quotes.company_id
        AND public.companies.owner_id = auth.uid()
    ));

-- Quote revision policies
DROP POLICY IF EXISTS "Quote revisions are viewable by quote viewers" ON public.quote_revisions;
CREATE POLICY "Quote revisions are viewable by quote viewers"
    ON public.quote_revisions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.quotes q
        JOIN public.companies c ON (
            c.owner_id = auth.uid() AND
            (
                c.id = q.company_id OR
                c.id = (SELECT company_id FROM public.rfqs WHERE id = q.rfq_id)
            )
        )
        WHERE q.id = public.quote_revisions.quote_id
    ));

DROP POLICY IF EXISTS "Quote revisions are managed by the system" ON public.quote_revisions;
CREATE POLICY "Quote revisions are managed by the system"
    ON public.quote_revisions FOR INSERT
    WITH CHECK (true);  -- Managed by trigger only

-- Functions
CREATE OR REPLACE FUNCTION public.get_rfq_statistics(p_rfq_id UUID)
RETURNS TABLE (
    total_quotes INTEGER,
    avg_quote_amount DECIMAL,
    min_quote_amount DECIMAL,
    max_quote_amount DECIMAL,
    avg_delivery_time INTERVAL
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        COUNT(*)::INTEGER as total_quotes,
        AVG(amount) as avg_quote_amount,
        MIN(amount) as min_quote_amount,
        MAX(amount) as max_quote_amount,
        AVG(CASE 
            WHEN delivery_time ~ '^[0-9]+ days$' 
            THEN (delivery_time::TEXT)::INTERVAL 
            ELSE NULL 
        END) as avg_delivery_time
    FROM public.quotes
    WHERE rfq_id = p_rfq_id AND status = 'submitted';
$$;

-- Trigger to update RFQ updated_at
CREATE OR REPLACE FUNCTION public.update_rfq_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_rfq_timestamp ON public.rfqs;
CREATE TRIGGER update_rfq_timestamp
    BEFORE UPDATE ON public.rfqs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_rfq_timestamp();

-- Trigger to update quote updated_at
DROP TRIGGER IF EXISTS update_quote_timestamp ON public.quotes;
CREATE TRIGGER update_quote_timestamp
    BEFORE UPDATE ON public.quotes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_rfq_timestamp();

-- Function to create quote revision
CREATE OR REPLACE FUNCTION public.create_quote_revision()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND (
        NEW.amount IS DISTINCT FROM OLD.amount OR
        NEW.currency IS DISTINCT FROM OLD.currency OR
        NEW.delivery_time IS DISTINCT FROM OLD.delivery_time OR
        NEW.notes IS DISTINCT FROM OLD.notes
    )) THEN
        INSERT INTO public.quote_revisions (
            quote_id,
            amount,
            currency,
            delivery_time,
            notes,
            revision_number,
            changes_description
        ) VALUES (
            NEW.id,
            NEW.amount,
            NEW.currency,
            NEW.delivery_time,
            NEW.notes,
            (SELECT COALESCE(MAX(revision_number), 0) + 1 FROM public.quote_revisions WHERE quote_id = NEW.id),
            'Quote updated'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_quote_revision_on_update ON public.quotes;
CREATE TRIGGER create_quote_revision_on_update
    AFTER UPDATE ON public.quotes
    FOR EACH ROW
    EXECUTE FUNCTION public.create_quote_revision(); 