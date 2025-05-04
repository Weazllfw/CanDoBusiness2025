-- Create enum for invitation status
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'rejected', 'expired');

-- Create enum for member roles
CREATE TYPE member_role AS ENUM ('admin', 'member');

-- Create company_invitations table
CREATE TABLE company_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role member_role NOT NULL DEFAULT 'member',
    status invitation_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    UNIQUE(company_id, email, status)
);

-- Create company_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS company_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role member_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(company_id, user_id),
    UNIQUE(company_id, email)
);

-- Add RLS policies for company_invitations
ALTER TABLE company_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can create invitations"
    ON company_invitations FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM company_members
            WHERE company_members.company_id = company_invitations.company_id
            AND company_members.user_id = auth.uid()
            AND company_members.role = 'admin'
        )
    );

CREATE POLICY "Company admins can view invitations"
    ON company_invitations FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM company_members
            WHERE company_members.company_id = company_invitations.company_id
            AND company_members.user_id = auth.uid()
            AND company_members.role = 'admin'
        )
    );

CREATE POLICY "Company admins can update invitations"
    ON company_invitations FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM company_members
            WHERE company_members.company_id = company_invitations.company_id
            AND company_members.user_id = auth.uid()
            AND company_members.role = 'admin'
        )
    );

CREATE POLICY "Company admins can delete invitations"
    ON company_invitations FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM company_members
            WHERE company_members.company_id = company_invitations.company_id
            AND company_members.user_id = auth.uid()
            AND company_members.role = 'admin'
        )
    );

-- Add RLS policies for company_members
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view other members"
    ON company_members FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM company_members AS cm
            WHERE cm.company_id = company_members.company_id
            AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "Company admins can manage members"
    ON company_members FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM company_members
            WHERE company_members.company_id = company_members.company_id
            AND company_members.user_id = auth.uid()
            AND company_members.role = 'admin'
        )
    );

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_company_invitations_updated_at
    BEFORE UPDATE ON company_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_members_updated_at
    BEFORE UPDATE ON company_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 