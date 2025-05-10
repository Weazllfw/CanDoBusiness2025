-- Add new columns to RFQs table
ALTER TABLE rfqs
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS required_certifications TEXT[],
ADD COLUMN IF NOT EXISTS attachments TEXT[],
ADD COLUMN IF NOT EXISTS preferred_delivery_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'invited')),
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS requirements JSONB,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Create RFQ templates table
CREATE TABLE IF NOT EXISTS rfq_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    required_certifications TEXT[],
    requirements JSONB,
    is_public BOOLEAN DEFAULT false
);

-- Create RFQ invitations table
CREATE TABLE IF NOT EXISTS rfq_invitations (
    rfq_id UUID REFERENCES rfqs(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    response_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (rfq_id, company_id)
);

-- Create quotes table
CREATE TABLE IF NOT EXISTS quotes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
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
CREATE TABLE IF NOT EXISTS quote_revisions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    amount DECIMAL NOT NULL,
    currency TEXT NOT NULL,
    delivery_time TEXT,
    notes TEXT,
    revision_number INTEGER NOT NULL,
    changes_description TEXT
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rfqs_company_id_status ON rfqs(company_id, status);
CREATE INDEX IF NOT EXISTS idx_rfqs_category ON rfqs(category);
CREATE INDEX IF NOT EXISTS idx_rfqs_deadline ON rfqs(deadline);
CREATE INDEX IF NOT EXISTS idx_quotes_rfq_id ON quotes(rfq_id);
CREATE INDEX IF NOT EXISTS idx_quotes_company_id ON quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_quote_revisions_quote_id ON quote_revisions(quote_id);

-- Add RLS policies
ALTER TABLE rfq_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_revisions ENABLE ROW LEVEL SECURITY;

-- RFQ template policies
CREATE POLICY "RFQ templates are viewable by owner and if public"
    ON rfq_templates FOR SELECT
    USING (
        is_public OR 
        EXISTS (
            SELECT 1 FROM companies
            WHERE companies.id = rfq_templates.company_id
            AND companies.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can create RFQ templates for their companies"
    ON rfq_templates FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM companies
        WHERE companies.id = rfq_templates.company_id
        AND companies.owner_id = auth.uid()
    ));

-- RFQ invitation policies
CREATE POLICY "Companies can view their RFQ invitations"
    ON rfq_invitations FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM companies
        WHERE companies.id = rfq_invitations.company_id
        AND companies.owner_id = auth.uid()
    ));

-- Quote policies
CREATE POLICY "Quotes are viewable by RFQ owner and quote creator"
    ON quotes FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM companies
        WHERE (
            companies.owner_id = auth.uid() AND
            (
                companies.id = quotes.company_id OR
                companies.id = (SELECT company_id FROM rfqs WHERE id = quotes.rfq_id)
            )
        )
    ));

CREATE POLICY "Companies can create quotes"
    ON quotes FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM companies
        WHERE companies.id = quotes.company_id
        AND companies.owner_id = auth.uid()
    ));

-- Quote revision policies
CREATE POLICY "Quote revisions are viewable by quote viewers"
    ON quote_revisions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM quotes q
        JOIN companies c ON (
            c.owner_id = auth.uid() AND
            (
                c.id = q.company_id OR
                c.id = (SELECT company_id FROM rfqs WHERE id = q.rfq_id)
            )
        )
        WHERE q.id = quote_revisions.quote_id
    ));

CREATE POLICY "Quote revisions are managed by the system"
    ON quote_revisions FOR INSERT
    WITH CHECK (true);  -- Managed by trigger only

-- Functions
CREATE OR REPLACE FUNCTION get_rfq_statistics(rfq_id UUID)
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
    FROM quotes
    WHERE rfq_id = $1 AND status = 'submitted';
$$;

-- Trigger to update RFQ updated_at
CREATE OR REPLACE FUNCTION update_rfq_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rfq_timestamp
    BEFORE UPDATE ON rfqs
    FOR EACH ROW
    EXECUTE FUNCTION update_rfq_timestamp();

-- Trigger to update quote updated_at
CREATE TRIGGER update_quote_timestamp
    BEFORE UPDATE ON quotes
    FOR EACH ROW
    EXECUTE FUNCTION update_rfq_timestamp();

-- Function to create quote revision
CREATE OR REPLACE FUNCTION create_quote_revision()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND (
        NEW.amount != OLD.amount OR
        NEW.currency != OLD.currency OR
        NEW.delivery_time != OLD.delivery_time OR
        NEW.notes != OLD.notes
    )) THEN
        INSERT INTO quote_revisions (
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
            (SELECT COALESCE(MAX(revision_number), 0) + 1 FROM quote_revisions WHERE quote_id = NEW.id),
            'Quote updated'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_quote_revision_on_update
    AFTER UPDATE ON quotes
    FOR EACH ROW
    EXECUTE FUNCTION create_quote_revision(); 