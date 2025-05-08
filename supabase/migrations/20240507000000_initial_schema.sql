-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create tables
CREATE TABLE companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    name TEXT NOT NULL,
    description TEXT,
    website TEXT,
    location TEXT,
    industry TEXT,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE rfqs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    budget DECIMAL,
    currency TEXT DEFAULT 'USD',
    deadline TIMESTAMP WITH TIME ZONE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed'))
);

CREATE TABLE posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    content TEXT NOT NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('general', 'rfq')),
    title TEXT,
    rfq_id UUID REFERENCES rfqs(id) ON DELETE SET NULL
);

CREATE TABLE messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    content TEXT NOT NULL,
    sender_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    read BOOLEAN DEFAULT FALSE
);

-- Create indexes
CREATE INDEX companies_owner_id_idx ON companies(owner_id);
CREATE INDEX posts_company_id_idx ON posts(company_id);
CREATE INDEX posts_rfq_id_idx ON posts(rfq_id);
CREATE INDEX rfqs_company_id_idx ON rfqs(company_id);
CREATE INDEX messages_sender_id_idx ON messages(sender_id);
CREATE INDEX messages_receiver_id_idx ON messages(receiver_id);

-- Create RLS policies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Companies policies
CREATE POLICY "Companies are viewable by everyone"
    ON companies FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own companies"
    ON companies FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own companies"
    ON companies FOR UPDATE
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own companies"
    ON companies FOR DELETE
    USING (auth.uid() = owner_id);

-- RFQ policies
CREATE POLICY "RFQs are viewable by everyone"
    ON rfqs FOR SELECT
    USING (true);

CREATE POLICY "Company owners can create RFQs"
    ON rfqs FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM companies
        WHERE companies.id = rfqs.company_id
        AND companies.owner_id = auth.uid()
    ));

CREATE POLICY "Company owners can update RFQs"
    ON rfqs FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM companies
        WHERE companies.id = rfqs.company_id
        AND companies.owner_id = auth.uid()
    ));

CREATE POLICY "Company owners can delete RFQs"
    ON rfqs FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM companies
        WHERE companies.id = rfqs.company_id
        AND companies.owner_id = auth.uid()
    ));

-- Posts policies
CREATE POLICY "Posts are viewable by everyone"
    ON posts FOR SELECT
    USING (true);

CREATE POLICY "Company owners can create posts"
    ON posts FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM companies
        WHERE companies.id = posts.company_id
        AND companies.owner_id = auth.uid()
    ));

CREATE POLICY "Company owners can update posts"
    ON posts FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM companies
        WHERE companies.id = posts.company_id
        AND companies.owner_id = auth.uid()
    ));

CREATE POLICY "Company owners can delete posts"
    ON posts FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM companies
        WHERE companies.id = posts.company_id
        AND companies.owner_id = auth.uid()
    ));

-- Messages policies
CREATE POLICY "Users can view messages they're involved in"
    ON messages FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM companies
        WHERE (companies.id = messages.sender_id OR companies.id = messages.receiver_id)
        AND companies.owner_id = auth.uid()
    ));

CREATE POLICY "Users can send messages from their companies"
    ON messages FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM companies
        WHERE companies.id = messages.sender_id
        AND companies.owner_id = auth.uid()
    ));

-- Functions
CREATE OR REPLACE FUNCTION get_user_companies(user_id UUID)
RETURNS SETOF companies
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT * FROM companies WHERE owner_id = user_id;
$$; 