-- Function to get all companies connected to a given company
CREATE OR REPLACE FUNCTION get_company_connections(p_company_id UUID)
RETURNS TABLE (
    connected_company_id UUID,
    name TEXT,
    avatar_url TEXT,
    industry TEXT,
    connected_at TIMESTAMPTZ -- Or whatever the timestamp field is in company_connections
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id AS connected_company_id,
        c.name,
        c.avatar_url,
        c.industry,
        cc.created_at AS connected_at -- Assuming 'created_at' is when the connection was established
    FROM company_connections cc
    JOIN companies_view c ON (cc.company1_id = p_company_id AND c.id = cc.company2_id) OR (cc.company2_id = p_company_id AND c.id = cc.company1_id)
    WHERE (cc.company1_id = p_company_id OR cc.company2_id = p_company_id)
      AND cc.status = 'CONNECTED'
      AND c.id != p_company_id; -- Ensure we don't return the company itself
END;
$$; 