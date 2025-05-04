-- Create company verification status enum
CREATE TYPE company_verification_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);

-- Add verification fields to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_badge_url text,
ADD COLUMN IF NOT EXISTS verified_at timestamptz,
ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create company verification requests table
CREATE TABLE IF NOT EXISTS company_verification_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
    submitter_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    business_legal_name text NOT NULL,
    business_number text NOT NULL,
    submitter_full_name text NOT NULL,
    submitter_email text NOT NULL,
    company_website text,
    company_linkedin text,
    company_phone text,
    status company_verification_status DEFAULT 'pending',
    admin_notes text,
    submitted_at timestamptz DEFAULT now(),
    processed_at timestamptz,
    processed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create a partial unique index to ensure only one pending request per company
CREATE UNIQUE INDEX idx_company_pending_verification 
ON company_verification_requests (company_id)
WHERE status = 'pending';

-- Add trigger for updated_at
CREATE TRIGGER update_verification_requests_updated_at
    BEFORE UPDATE ON company_verification_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE company_verification_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company_verification_requests
CREATE POLICY "view_verification_requests"
    ON company_verification_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM company_users
            WHERE company_users.company_id = company_id
            AND company_users.user_id = auth.uid()
            AND company_users.role = 'owner'
        )
        OR
        auth.uid() IN (
            SELECT id FROM auth.users
            WHERE raw_user_meta_data->>'is_admin' = 'true'
        )
    );

CREATE POLICY "submit_verification_requests"
    ON company_verification_requests FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM company_users
            WHERE company_users.company_id = company_id
            AND company_users.user_id = auth.uid()
            AND company_users.role = 'owner'
        )
    );

CREATE POLICY "process_verification_requests"
    ON company_verification_requests FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT id FROM auth.users
            WHERE raw_user_meta_data->>'is_admin' = 'true'
        )
    );

-- Add trigger for updated_at on companies for verification fields
CREATE TRIGGER update_companies_verification_updated_at
    BEFORE UPDATE OF is_verified, verification_badge_url, verified_at, verified_by
    ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add DELETE policy for verification requests
CREATE POLICY "delete_verification_requests"
    ON company_verification_requests FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM company_users
            WHERE company_users.company_id = company_id
            AND company_users.user_id = auth.uid()
            AND company_users.role = 'owner'
        )
        OR
        auth.uid() IN (
            SELECT id FROM auth.users
            WHERE raw_user_meta_data->>'is_admin' = 'true'
        )
    );

-- Function to submit a verification request
CREATE OR REPLACE FUNCTION submit_company_verification_request(
    p_company_id uuid,
    p_business_legal_name text,
    p_business_number text,
    p_submitter_full_name text,
    p_submitter_email text,
    p_company_website text DEFAULT NULL,
    p_company_linkedin text DEFAULT NULL,
    p_company_phone text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_request_id uuid;
BEGIN
    -- Check if user is company owner
    IF NOT EXISTS (
        SELECT 1 FROM company_users
        WHERE company_id = p_company_id
        AND user_id = auth.uid()
        AND role = 'owner'
    ) THEN
        RAISE EXCEPTION 'Only company owners can submit verification requests';
    END IF;

    -- Check if there's already a pending request
    IF EXISTS (
        SELECT 1 FROM company_verification_requests
        WHERE company_id = p_company_id
        AND status = 'pending'
    ) THEN
        RAISE EXCEPTION 'A pending verification request already exists for this company';
    END IF;

    -- Insert verification request
    INSERT INTO company_verification_requests (
        company_id,
        submitter_id,
        business_legal_name,
        business_number,
        submitter_full_name,
        submitter_email,
        company_website,
        company_linkedin,
        company_phone
    ) VALUES (
        p_company_id,
        auth.uid(),
        p_business_legal_name,
        p_business_number,
        p_submitter_full_name,
        p_submitter_email,
        p_company_website,
        p_company_linkedin,
        p_company_phone
    )
    RETURNING id INTO v_request_id;

    RETURN v_request_id;
END;
$$;

-- Function to process a verification request
CREATE OR REPLACE FUNCTION process_verification_request(
    p_request_id uuid,
    p_status company_verification_status,
    p_admin_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_company_id uuid;
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND raw_user_meta_data->>'is_admin' = 'true'
    ) THEN
        RAISE EXCEPTION 'Only administrators can process verification requests';
    END IF;

    -- Get company ID and update request
    SELECT company_id INTO v_company_id
    FROM company_verification_requests
    WHERE id = p_request_id
    AND status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Verification request not found or already processed';
    END IF;

    -- Update request status
    UPDATE company_verification_requests
    SET status = p_status,
        admin_notes = p_admin_notes,
        processed_at = now(),
        processed_by = auth.uid()
    WHERE id = p_request_id;

    -- If approved, update company verification status
    IF p_status = 'approved' THEN
        UPDATE companies
        SET is_verified = true,
            verified_at = now(),
            verified_by = auth.uid()
        WHERE id = v_company_id;
    END IF;

    RETURN true;
END;
$$;

-- Grant necessary permissions
GRANT ALL ON company_verification_requests TO authenticated;
GRANT EXECUTE ON FUNCTION submit_company_verification_request TO authenticated;
GRANT EXECUTE ON FUNCTION process_verification_request TO authenticated; 