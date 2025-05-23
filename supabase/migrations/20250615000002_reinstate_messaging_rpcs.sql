-- Migration: Reinstate Messaging RPCs for MVP (send_message, get_conversations, get_messages_for_conversation)
-- This migration effectively re-applies the definitions from:
-- - 20250612000012_update_send_message_for_platform_interaction_model.sql
-- - 20250612000013_update_get_conversations_for_platform_interaction.sql
-- - 20250612000014_create_get_messages_for_conversation_rpc.sql

BEGIN;

-- 1. Reinstate public.send_message
-- From: 20250612000012_update_send_message_for_platform_interaction_model.sql

DROP FUNCTION IF EXISTS public.send_message(UUID, TEXT);
DROP FUNCTION IF EXISTS public.send_message(UUID, TEXT, UUID, BOOLEAN);
DROP FUNCTION IF EXISTS public.send_message(p_receiver_id UUID, p_content TEXT, p_is_system_message BOOLEAN);


CREATE OR REPLACE FUNCTION public.send_message(
    p_receiver_id UUID, -- Can be a user ID or a company ID
    p_content TEXT,
    p_acting_as_company_id UUID DEFAULT NULL,
    p_target_is_company BOOLEAN DEFAULT FALSE -- Flag to indicate if p_receiver_id is a company_id
)
RETURNS public.messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
AS $$
DECLARE
    v_sender_id UUID := auth.uid();
    v_sender_profile public.profiles;
    v_receiver_profile public.profiles;
    v_acting_company public.companies;
    v_target_company public.companies;
    v_new_message public.messages;
    v_can_send BOOLEAN := FALSE;
BEGIN
    -- Basic Validations
    IF p_content IS NULL OR trim(p_content) = '' THEN
        RAISE EXCEPTION 'Message content cannot be empty.';
    END IF;

    SELECT * INTO v_sender_profile FROM public.profiles WHERE id = v_sender_id;
    IF v_sender_profile IS NULL OR v_sender_profile.status != 'active' THEN
        RAISE EXCEPTION 'Sender profile not found or is not active.';
    END IF;

    IF p_acting_as_company_id IS NOT NULL THEN
        -- Sending on behalf of a company
        SELECT * INTO v_acting_company FROM public.companies WHERE id = p_acting_as_company_id AND deleted_at IS NULL;
        IF v_acting_company IS NULL THEN
            RAISE EXCEPTION 'Acting company not found or has been deleted.';
        END IF;
        IF NOT internal.is_company_admin(v_sender_id, p_acting_as_company_id) THEN
            RAISE EXCEPTION 'User is not an admin of the acting company.';
        END IF;

        IF p_target_is_company THEN
            -- Company -> Company
            SELECT * INTO v_target_company FROM public.companies WHERE id = p_receiver_id AND deleted_at IS NULL;
            IF v_target_company IS NULL THEN
                RAISE EXCEPTION 'Target company not found or has been deleted.';
            END IF;
            IF v_acting_company.id = v_target_company.id THEN
                RAISE EXCEPTION 'A company cannot send a message to itself.';
            END IF;
            -- Rule: Allow C->C. Verification status can be a future enhancement.
            v_can_send := TRUE;
        ELSE
            -- Company -> User
            SELECT * INTO v_receiver_profile FROM public.profiles WHERE id = p_receiver_id AND status = 'active';
            IF v_receiver_profile IS NULL THEN
                RAISE EXCEPTION 'Receiver profile not found or is not active.';
            END IF;
            -- Rule: Allow C->U. Verification status for sending company can be a future enhancement.
            v_can_send := TRUE;
        END IF;
    ELSE
        -- Sending as a user
        IF p_target_is_company THEN
            -- User -> Company
            SELECT * INTO v_target_company FROM public.companies WHERE id = p_receiver_id AND deleted_at IS NULL;
            IF v_target_company IS NULL THEN
                RAISE EXCEPTION 'Target company not found or has been deleted.';
            END IF;
            -- Rule: Allow U->C.
            v_can_send := TRUE;
        ELSE
            -- User -> User
            SELECT * INTO v_receiver_profile FROM public.profiles WHERE id = p_receiver_id AND status = 'active';
            IF v_receiver_profile IS NULL THEN
                RAISE EXCEPTION 'Receiver profile not found or is not active.';
            END IF;
            IF v_sender_id = p_receiver_id THEN
                RAISE EXCEPTION 'Cannot send a message to yourself.';
            END IF;
            -- Rule: Only if mutually connected.
            IF internal.are_users_connected(v_sender_id, p_receiver_id) THEN
                v_can_send := TRUE;
            ELSE
                RAISE EXCEPTION 'Users must be connected to send messages.';
            END IF;
        END IF;
    END IF;

    IF NOT v_can_send THEN
        -- This should ideally not be reached if logic above is comprehensive for MVP
        RAISE EXCEPTION 'Message sending conditions not met. Review MVP rules.';
    END IF;

    INSERT INTO public.messages (sender_id, receiver_id, content, is_system_message, read, acting_as_company_id, target_is_company)
    VALUES (v_sender_id, p_receiver_id, p_content, FALSE, FALSE, p_acting_as_company_id, p_target_is_company)
    RETURNING * INTO v_new_message;

    RETURN v_new_message;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_message(UUID, TEXT, UUID, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION public.send_message(UUID, TEXT, UUID, BOOLEAN)
IS 'MVP version: Allows sending a message. User->User (requires connection), User->Company, Company->User, Company->Company. Uses acting_as_company_id and target_is_company.';

DO $$ BEGIN
  RAISE NOTICE 'RPC function send_message reinstated for MVP.';
END $$;


-- 2. Reinstate public.get_conversations
-- From: 20250612000013_update_get_conversations_for_platform_interaction.sql

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
SECURITY INVOKER
AS $$
DECLARE
    v_current_user_id UUID := auth.uid();
    v_user_administered_company_ids UUID[];
BEGIN
    -- Get all companies administered by the current user for efficient checking
    SELECT array_agg(cu.company_id) INTO v_user_administered_company_ids
    FROM public.company_users cu
    WHERE cu.user_id = v_current_user_id AND cu.role IN ('ADMIN', 'OWNER');

    RETURN QUERY
    WITH message_partners AS (
        -- Determine the effective "other party" for each message
        SELECT
            m.id AS message_id,
            m.created_at,
            m.content,
            m.sender_id AS original_sender_user_id, -- User who physically sent it
            m.receiver_id AS original_receiver_entity_id, -- User or Company ID it was addressed to
            m.read,
            m.acting_as_company_id, -- Company on whose behalf sender acted (if any)
            m.target_is_company, -- True if receiver_id is a company
            
            -- Logic to determine the conversation partner for the v_current_user_id
            CASE
                -- Scenario 1: Current user sent the message (either as self or as a company)
                WHEN m.sender_id = v_current_user_id THEN
                    CASE
                        WHEN m.target_is_company THEN m.receiver_id -- Sent to a company (partner is the company)
                        ELSE m.receiver_id -- Sent to a user (partner is the user)
                    END
                
                -- Scenario 2: Current user received the message (either as self or as an admin of a target company)
                WHEN m.receiver_id = v_current_user_id AND NOT m.target_is_company THEN -- Received as self from a user or company
                    CASE
                        WHEN m.acting_as_company_id IS NOT NULL THEN m.acting_as_company_id -- From a company (partner is the company)
                        ELSE m.sender_id -- From a user (partner is the user)
                    END
                WHEN m.target_is_company AND m.receiver_id = ANY(v_user_administered_company_ids) THEN -- Received as admin of a company
                    CASE
                        WHEN m.acting_as_company_id IS NOT NULL THEN m.acting_as_company_id -- From another company (partner is the sending company)
                        ELSE m.sender_id -- From a user (partner is the user)
                    END
                ELSE NULL -- Message is not directly part of a conversation for the current user (should be filtered out by WHERE)
            END AS effective_partner_id,
            
            CASE
                WHEN m.sender_id = v_current_user_id THEN
                    CASE
                        WHEN m.target_is_company THEN 'company'::TEXT
                        ELSE 'user'::TEXT
                    END
                WHEN m.receiver_id = v_current_user_id AND NOT m.target_is_company THEN
                    CASE
                        WHEN m.acting_as_company_id IS NOT NULL THEN 'company'::TEXT
                        ELSE 'user'::TEXT
                    END
                WHEN m.target_is_company AND m.receiver_id = ANY(v_user_administered_company_ids) THEN
                     CASE
                        WHEN m.acting_as_company_id IS NOT NULL THEN 'company'::TEXT
                        ELSE 'user'::TEXT
                    END
                ELSE NULL::TEXT
            END AS effective_partner_type

        FROM public.messages m
        WHERE
            m.is_system_message = FALSE AND
            (
                -- Messages involving the current user directly (sent or received)
                (m.sender_id = v_current_user_id) OR
                (m.receiver_id = v_current_user_id AND NOT m.target_is_company) OR
                -- Messages involving a company the current user administers (received by that company)
                (m.target_is_company AND m.receiver_id = ANY(v_user_administered_company_ids))
            )
    ),
    ranked_conversations AS (
        SELECT
            mp.*,
            ROW_NUMBER() OVER (PARTITION BY mp.effective_partner_id, mp.effective_partner_type ORDER BY mp.created_at DESC) as rn
        FROM message_partners mp
        WHERE mp.effective_partner_id IS NOT NULL AND mp.effective_partner_id != (
             CASE -- Exclude conversations with oneself or one's own company
                WHEN mp.effective_partner_type = 'user' THEN v_current_user_id
                WHEN mp.effective_partner_type = 'company' THEN mp.acting_as_company_id -- if current user sent as this company
                ELSE NULL
            END
        )
        AND NOT (mp.effective_partner_type = 'company' AND mp.effective_partner_id = mp.acting_as_company_id AND mp.acting_as_company_id = ANY(v_user_administered_company_ids)) -- Don't show convos where one of my companies talks to itself
    )
    SELECT
        rc.effective_partner_id AS partner_id,
        rc.effective_partner_type AS partner_type,
        CASE
            WHEN rc.effective_partner_type = 'user' THEN (SELECT p.name FROM public.profiles p WHERE p.id = rc.effective_partner_id AND p.status='active')
            WHEN rc.effective_partner_type = 'company' THEN (SELECT c.name FROM public.companies c WHERE c.id = rc.effective_partner_id AND c.deleted_at IS NULL)
        END AS partner_name,
        CASE
            WHEN rc.effective_partner_type = 'user' THEN (SELECT p.avatar_url FROM public.profiles p WHERE p.id = rc.effective_partner_id)
            WHEN rc.effective_partner_type = 'company' THEN (SELECT c.avatar_url FROM public.companies c WHERE c.id = rc.effective_partner_id)
        END AS partner_avatar_url,
        rc.message_id AS last_message_id,
        rc.content AS last_message_content,
        rc.created_at AS last_message_at,
        rc.original_sender_user_id AS last_message_sender_id,
        rc.acting_as_company_id AS last_message_acting_as_company_id,
        (
            SELECT COUNT(*)
            FROM public.messages unread_m
            WHERE unread_m.read = FALSE AND unread_m.is_system_message = FALSE
            AND (
                 -- Case A: Current user received message directly (as a user)
                 (unread_m.receiver_id = v_current_user_id AND NOT unread_m.target_is_company AND 
                    ( (rc.effective_partner_type = 'user' AND unread_m.sender_id = rc.effective_partner_id) OR 
                      (rc.effective_partner_type = 'company' AND unread_m.acting_as_company_id = rc.effective_partner_id) )
                 ) OR
                 -- Case B: Message sent to a company current user administers
                 (unread_m.target_is_company AND unread_m.receiver_id = ANY(v_user_administered_company_ids) AND unread_m.receiver_id = 
                    CASE -- Match unread message to the company that is the partner in *this* conversation row
                        WHEN rc.effective_partner_type = 'user' THEN unread_m.receiver_id -- if partner is a user, current user is admin of receiver_id
                        WHEN rc.effective_partner_type = 'company' AND rc.effective_partner_id != unread_m.receiver_id THEN unread_m.receiver_id -- if partner is a company, and it's not this company, then current user is admin of receiver_id
                        ELSE NULL -- Should not count if current user's company sent to itself.
                    END
                    AND 
                    ( (rc.effective_partner_type = 'user' AND unread_m.sender_id = rc.effective_partner_id) OR 
                      (rc.effective_partner_type = 'company' AND unread_m.acting_as_company_id = rc.effective_partner_id AND unread_m.acting_as_company_id != unread_m.receiver_id) )
                 )
            ) AND (
                -- Tie unread message back to the specific conversation partner
                (rc.effective_partner_type = 'user' AND (unread_m.sender_id = rc.effective_partner_id OR unread_m.receiver_id = rc.effective_partner_id)) OR
                (rc.effective_partner_type = 'company' AND (unread_m.acting_as_company_id = rc.effective_partner_id OR (unread_m.target_is_company AND unread_m.receiver_id = rc.effective_partner_id)))
            )
        ) AS unread_count
    FROM ranked_conversations rc
    WHERE rc.rn = 1
    ORDER BY rc.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_conversations() TO authenticated;

COMMENT ON FUNCTION public.get_conversations()
IS 'MVP version: Retrieves a list of conversations for the current user, including those with other users and with/on-behalf-of companies. Identifies the conversation partner (user or company) and provides details of the last message and unread count.';

DO $$ BEGIN
  RAISE NOTICE 'RPC function get_conversations reinstated for MVP.';
END $$;


-- 3. Reinstate public.get_messages_for_conversation
-- From: 20250612000014_create_get_messages_for_conversation_rpc.sql

DROP FUNCTION IF EXISTS public.get_messages_for_conversation(UUID, TEXT, INT, INT);

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
    sender_id UUID, -- original user sender
    sender_name TEXT,
    sender_avatar_url TEXT,
    acting_as_company_id UUID,
    acting_as_company_name TEXT,
    acting_as_company_logo_url TEXT,
    is_sent_by_current_user_context BOOLEAN -- True if the message aligns with the current user's perspective in this conversation
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_current_user_id UUID := auth.uid();
    v_offset INT := (GREATEST(1, p_page_number) - 1) * GREATEST(1, p_page_size);
    v_user_administered_company_ids UUID[];
BEGIN
    -- Get all companies administered by the current user
    SELECT array_agg(cu.company_id) INTO v_user_administered_company_ids
    FROM public.company_users cu
    WHERE cu.user_id = v_current_user_id AND cu.role IN ('ADMIN', 'OWNER');

    RETURN QUERY
    SELECT
        m.id,
        m.created_at,
        m.content,
        m.sender_id, -- This is always the user who authored the message
        s_profile.name AS sender_name,
        s_profile.avatar_url AS sender_avatar_url,
        m.acting_as_company_id,
        act_comp.name AS acting_as_company_name,
        act_comp.avatar_url AS acting_as_company_logo_url, -- Corrected from logo_url
        CASE
            -- Message sent by the current user (as self)
            WHEN m.sender_id = v_current_user_id AND m.acting_as_company_id IS NULL THEN TRUE
            -- Message sent by the current user ON BEHALF of a company that is NOT the partner (if partner is a company)
            WHEN m.sender_id = v_current_user_id AND m.acting_as_company_id IS NOT NULL AND (p_partner_type = 'user' OR m.acting_as_company_id != p_partner_id) THEN TRUE
            -- Special case: current user sent as one of their companies, to the partner company.
            -- This logic branch helps define "sent by me" when I am viewing a C2C convo where my company is the sender.
            WHEN p_partner_type = 'company' AND m.acting_as_company_id = ANY(v_user_administered_company_ids) AND m.receiver_id = p_partner_id THEN TRUE
             -- Special case: current user sent as one of their companies, to the partner user.
            WHEN p_partner_type = 'user' AND m.acting_as_company_id = ANY(v_user_administered_company_ids) AND m.receiver_id = p_partner_id THEN TRUE
            ELSE FALSE
        END AS is_sent_by_current_user_context
    FROM
        public.messages m
    LEFT JOIN
        public.profiles s_profile ON m.sender_id = s_profile.id -- Join with profiles for actual sender user details
    LEFT JOIN
        public.companies act_comp ON m.acting_as_company_id = act_comp.id -- Join with companies for "acting as" details
    WHERE
        m.is_system_message = FALSE AND
        (
            -- Filter for messages relevant to the conversation between current user (or their companies) and the p_partner_id/p_partner_type
            
            -- Scenario A: Partner is a USER (p_partner_id is a user_id)
            (p_partner_type = 'user' AND p_partner_id IS NOT NULL AND
                (
                    -- 1. Current user (as self) to partner user
                    (m.sender_id = v_current_user_id AND m.acting_as_company_id IS NULL AND NOT m.target_is_company AND m.receiver_id = p_partner_id) OR
                    -- 2. Partner user to current user (as self)
                    (m.sender_id = p_partner_id AND m.acting_as_company_id IS NULL AND NOT m.target_is_company AND m.receiver_id = v_current_user_id) OR
                    -- 3. Current user (as one of their companies) to partner user
                    (m.sender_id = v_current_user_id AND m.acting_as_company_id = ANY(v_user_administered_company_ids) AND NOT m.target_is_company AND m.receiver_id = p_partner_id) OR
                    -- 4. Partner user to a company administered by current user (SHOULD BE CAUGHT BY get_conversations logic, this is to show messages if current user is "viewing as company")
                    -- This scenario is tricky for get_messages. get_conversations should define partner as the user if messages are U->AdministeredCompany.
                    -- For MVP, keeping it simpler: if partner_type is user, expect U2U or C2U (where C is one of current user's companies)
                    (m.sender_id = p_partner_id AND m.acting_as_company_id IS NULL AND m.target_is_company AND m.receiver_id = ANY(v_user_administered_company_ids))
                )
            ) OR

            -- Scenario B: Partner is a COMPANY (p_partner_id is a company_id)
            (p_partner_type = 'company' AND p_partner_id IS NOT NULL AND
                (
                    -- 1. Current user (as self) to partner company
                    (m.sender_id = v_current_user_id AND m.acting_as_company_id IS NULL AND m.target_is_company AND m.receiver_id = p_partner_id) OR
                    -- 2. Partner company (message sent on its behalf) to current user (as self)
                    (m.acting_as_company_id = p_partner_id AND NOT m.target_is_company AND m.receiver_id = v_current_user_id) OR
                    -- 3. Current user (as one of their companies) to partner company
                    (m.sender_id = v_current_user_id AND m.acting_as_company_id = ANY(v_user_administered_company_ids) AND m.acting_as_company_id != p_partner_id AND m.target_is_company AND m.receiver_id = p_partner_id) OR
                    -- 4. Partner company to a company administered by current user
                    (m.acting_as_company_id = p_partner_id AND m.target_is_company AND m.receiver_id = ANY(v_user_administered_company_ids) AND m.receiver_id != p_partner_id )
                )
            )
        )
    ORDER BY
        m.created_at DESC
    LIMIT GREATEST(1, p_page_size)
    OFFSET v_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_messages_for_conversation(UUID, TEXT, INT, INT) TO authenticated;

COMMENT ON FUNCTION public.get_messages_for_conversation(UUID, TEXT, INT, INT)
IS 'MVP version: Retrieves messages for a specific conversation partner (user or company) for the current user, with pagination. Includes details about sender and if they acted as a company.';

DO $$ BEGIN
  RAISE NOTICE 'RPC function get_messages_for_conversation reinstated for MVP.';
END $$;

COMMIT; 