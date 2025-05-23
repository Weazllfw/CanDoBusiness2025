-- Migration: Create public.get_messages_for_conversation RPC

CREATE OR REPLACE FUNCTION public.get_messages_for_conversation(
    p_partner_id UUID,
    p_partner_type TEXT, -- 'user' or 'company'
    p_page_number INT DEFAULT 1,
    p_page_size INT DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    content TEXT,
    sender_id UUID,
    sender_name TEXT,
    sender_avatar_url TEXT,
    acting_as_company_id UUID,
    acting_as_company_name TEXT,
    acting_as_company_logo_url TEXT,
    is_sent_by_current_user BOOLEAN -- True if the message was from the perspective of the calling user/their company
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_current_user_id UUID := auth.uid();
    v_offset INT := (GREATEST(1, p_page_number) - 1) * GREATEST(1, p_page_size);
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        m.created_at,
        m.content,
        m.sender_id,
        s_profile.name AS sender_name,
        s_profile.avatar_url AS sender_avatar_url,
        m.acting_as_company_id,
        act_comp.name AS acting_as_company_name,
        act_comp.logo_url AS acting_as_company_logo_url,
        CASE
            WHEN m.sender_id = v_current_user_id THEN TRUE
            ELSE FALSE
        END AS is_sent_by_current_user
    FROM
        public.messages m
    LEFT JOIN
        public.profiles s_profile ON m.sender_id = s_profile.id
    LEFT JOIN
        public.companies act_comp ON m.acting_as_company_id = act_comp.id
    WHERE
        m.is_system_message = FALSE AND
        (
            -- Case 1: Conversation with another USER (p_partner_type = 'user')
            (p_partner_type = 'user' AND (
                -- Current user sent to partner user, or partner user sent to current user
                (m.sender_id = v_current_user_id AND m.receiver_id = p_partner_id AND m.acting_as_company_id IS NULL AND NOT m.target_is_company) OR
                (m.sender_id = p_partner_id AND m.receiver_id = v_current_user_id AND m.acting_as_company_id IS NULL AND NOT m.target_is_company)
            ))
            OR
            -- Case 2: Conversation with a COMPANY (p_partner_type = 'company')
            (p_partner_type = 'company' AND (
                -- Current user (as self) interacting with target company
                (m.sender_id = v_current_user_id AND m.target_is_company AND m.receiver_id = p_partner_id AND m.acting_as_company_id IS NULL) OR 
                (m.receiver_id = v_current_user_id AND NOT m.target_is_company AND m.acting_as_company_id = p_partner_id) OR

                -- Current user (as one of their companies) interacting with target company
                (m.acting_as_company_id IN (SELECT cu.company_id FROM public.company_users cu WHERE cu.user_id = v_current_user_id) AND m.target_is_company AND m.receiver_id = p_partner_id) OR
                (m.target_is_company AND m.receiver_id IN (SELECT cu.company_id FROM public.company_users cu WHERE cu.user_id = v_current_user_id) AND m.acting_as_company_id = p_partner_id)
            ))
        )
    ORDER BY
        m.created_at DESC
    LIMIT GREATEST(1, p_page_size)
    OFFSET v_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_messages_for_conversation(UUID, TEXT, INT, INT) TO authenticated;

COMMENT ON FUNCTION public.get_messages_for_conversation(UUID, TEXT, INT, INT)
IS 'Retrieves messages for a specific conversation partner (user or company) for the current user, with pagination. Includes details about sender and if they acted as a company.';

DO $$ BEGIN
  RAISE NOTICE 'RPC function get_messages_for_conversation created.';
END $$; 