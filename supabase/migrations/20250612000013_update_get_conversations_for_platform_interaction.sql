-- Migration: Update public.get_conversations for Platform Interaction Model

DROP FUNCTION IF EXISTS public.get_conversations();

CREATE OR REPLACE FUNCTION public.get_conversations()
RETURNS TABLE(
    partner_id UUID, -- Can be a user ID or a company ID
    partner_type TEXT, -- 'user' or 'company'
    partner_name TEXT,
    partner_avatar_url TEXT,
    last_message_id UUID,
    last_message_content TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE,
    last_message_sender_id UUID, -- Original sender_id (user)
    last_message_acting_as_company_id UUID, -- Company on whose behalf message was sent
    unread_count BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER -- Or DEFINER if necessary, but INVOKER is typical for this kind of user-facing function
AS $$
DECLARE
    v_current_user_id UUID := auth.uid();
BEGIN
    RETURN QUERY
    WITH message_partners AS (
        -- Determine the effective "other party" for each message
        -- This is complex because a message can be U->U, U->C, C->U, C->C
        SELECT
            m.id AS message_id,
            m.created_at,
            m.content,
            m.sender_id,
            m.receiver_id,
            m.read,
            m.acting_as_company_id,
            m.target_is_company,
            -- Determine the partner ID and type for the current user
            CASE
                WHEN m.acting_as_company_id IS NOT NULL AND m.sender_id = v_current_user_id THEN -- Current user sent as a company
                    CASE
                        WHEN m.target_is_company THEN m.receiver_id -- C -> C (partner is target company)
                        ELSE m.receiver_id -- C -> U (partner is target user)
                    END
                WHEN m.target_is_company AND m.receiver_id IN (SELECT company_id FROM company_users WHERE user_id = v_current_user_id AND role IN ('ADMIN', 'OWNER')) THEN -- Current user received as a company admin
                    CASE
                        WHEN m.acting_as_company_id IS NOT NULL THEN m.acting_as_company_id -- C -> C (partner is acting company)
                        ELSE m.sender_id -- U -> C (partner is sender user)
                    END
                WHEN m.sender_id = v_current_user_id THEN m.receiver_id -- U -> U (sent by current user, partner is receiver)
                WHEN m.receiver_id = v_current_user_id THEN -- U -> U (received by current user, partner is sender)
                    CASE
                        WHEN m.acting_as_company_id IS NOT NULL THEN m.acting_as_company_id -- C -> U (partner is acting company)
                        ELSE m.sender_id
                    END
                ELSE NULL -- Should not happen in normal flow for conversations involving the current user
            END AS partner_id,
            CASE
                 WHEN m.acting_as_company_id IS NOT NULL AND m.sender_id = v_current_user_id THEN -- Current user sent as a company
                    CASE
                        WHEN m.target_is_company THEN 'company'::TEXT -- C -> C (partner is target company)
                        ELSE 'user'::TEXT -- C -> U (partner is target user)
                    END
                WHEN m.target_is_company AND m.receiver_id IN (SELECT company_id FROM company_users WHERE user_id = v_current_user_id AND role IN ('ADMIN', 'OWNER')) THEN -- Current user received as a company admin
                     CASE
                        WHEN m.acting_as_company_id IS NOT NULL THEN 'company'::TEXT -- C -> C (partner is acting company)
                        ELSE 'user'::TEXT -- U -> C (partner is sender user)
                    END
                WHEN m.sender_id = v_current_user_id AND m.target_is_company THEN 'company'::TEXT -- U -> C (sent by user, partner is company)
                WHEN m.sender_id = v_current_user_id AND NOT m.target_is_company THEN 'user'::TEXT -- U -> U (sent by user, partner is user)
                WHEN m.receiver_id = v_current_user_id THEN
                    CASE
                        WHEN m.acting_as_company_id IS NOT NULL THEN 'company'::TEXT -- C -> U (partner is acting company)
                        ELSE 'user'::TEXT -- U -> U (partner is user sender)
                    END
                ELSE NULL::TEXT
            END AS partner_type
        FROM public.messages m
        WHERE
            m.is_system_message = FALSE AND
            (
                -- Messages sent by the current user (personally or as a company)
                m.sender_id = v_current_user_id OR
                -- Messages received by the current user (personally)
                (m.receiver_id = v_current_user_id AND NOT m.target_is_company) OR
                -- Messages received by a company the current user administers
                (m.target_is_company AND m.receiver_id IN (SELECT cu.company_id FROM public.company_users cu WHERE cu.user_id = v_current_user_id AND cu.role IN ('ADMIN', 'OWNER')))
            )
    ),
    ranked_conversations AS (
        SELECT
            mp.*,
            ROW_NUMBER() OVER (PARTITION BY mp.partner_id, mp.partner_type ORDER BY mp.created_at DESC) as rn
        FROM message_partners mp
        WHERE mp.partner_id IS NOT NULL -- Filter out any messages that couldn't be mapped to a partner for the current user
    )
    SELECT
        rc.partner_id,
        rc.partner_type,
        CASE
            WHEN rc.partner_type = 'user' THEN (SELECT p.name FROM public.profiles p WHERE p.id = rc.partner_id)
            WHEN rc.partner_type = 'company' THEN (SELECT c.name FROM public.companies c WHERE c.id = rc.partner_id)
        END AS partner_name,
        CASE
            WHEN rc.partner_type = 'user' THEN (SELECT p.avatar_url FROM public.profiles p WHERE p.id = rc.partner_id)
            WHEN rc.partner_type = 'company' THEN (SELECT c.avatar_url FROM public.companies c WHERE c.id = rc.partner_id)
        END AS partner_avatar_url,
        rc.message_id AS last_message_id,
        rc.content AS last_message_content,
        rc.created_at AS last_message_at,
        rc.sender_id AS last_message_sender_id,
        rc.acting_as_company_id AS last_message_acting_as_company_id,
        (
            SELECT COUNT(*)
            FROM public.messages unread_m
            WHERE unread_m.read = FALSE AND unread_m.is_system_message = FALSE
            AND (
                -- Unread messages sent to the current user by this partner
                (unread_m.receiver_id = v_current_user_id AND NOT unread_m.target_is_company AND unread_m.sender_id = rc.partner_id AND rc.partner_type = 'user') OR
                (unread_m.receiver_id = v_current_user_id AND NOT unread_m.target_is_company AND unread_m.acting_as_company_id = rc.partner_id AND rc.partner_type = 'company') OR
                -- Unread messages sent to a company administered by the current user by this partner
                (unread_m.target_is_company AND unread_m.receiver_id IN (SELECT cu.company_id FROM public.company_users cu WHERE cu.user_id = v_current_user_id AND cu.role IN ('ADMIN', 'OWNER'))
                    AND (
                         (unread_m.sender_id = rc.partner_id AND rc.partner_type = 'user') OR 
                         (unread_m.acting_as_company_id = rc.partner_id AND rc.partner_type = 'company')
                        )
                    AND unread_m.receiver_id = CASE WHEN rc.acting_as_company_id = unread_m.receiver_id THEN rc.acting_as_company_id ELSE rc.partner_id END
                )
            )
        ) AS unread_count
    FROM ranked_conversations rc
    WHERE rc.rn = 1
    ORDER BY rc.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_conversations() TO authenticated;

COMMENT ON FUNCTION public.get_conversations()
IS 'Retrieves a list of conversations for the current user, including those with other users and with/on-behalf-of companies. Identifies the conversation partner (user or company) and provides details of the last message and unread count.';

DO $$ BEGIN
  RAISE NOTICE 'RPC function get_conversations updated for Platform Interaction Model.';
END $$; 