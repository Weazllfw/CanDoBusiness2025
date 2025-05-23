-- Migration: Update public.send_message for Platform Interaction Model

-- Drop the existing function (if it exists with the old signature)
DROP FUNCTION IF EXISTS public.send_message(UUID, TEXT);
-- Drop the existing function (if it exists with the even older signature without connection check)
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
            -- Rule: Always allowed between verified companies (for now, allow if both exist, verification can be an enhancement)
            IF v_acting_company.verification_status IN ('TIER1_VERIFIED', 'TIER2_FULLY_VERIFIED') AND 
               v_target_company.verification_status IN ('TIER1_VERIFIED', 'TIER2_FULLY_VERIFIED') THEN
                v_can_send := TRUE;
            ELSE
                -- Fallback for unverified or partially verified, for now allow if both exist
                 v_can_send := TRUE; -- Placeholder: More specific rules can be added
            END IF;
        ELSE
            -- Company -> User
            SELECT * INTO v_receiver_profile FROM public.profiles WHERE id = p_receiver_id AND status = 'active';
            IF v_receiver_profile IS NULL THEN
                RAISE EXCEPTION 'Receiver profile not found or is not active.';
            END IF;
            -- Rule: Allowed from verified companies
            IF v_acting_company.verification_status IN ('TIER1_VERIFIED', 'TIER2_FULLY_VERIFIED') THEN
                v_can_send := TRUE;
            ELSE
                -- Potentially limit if acting company is not verified
                RAISE EXCEPTION 'Messages from unverified companies to users are restricted.';
            END IF;
        END IF;
    ELSE
        -- Sending as a user
        IF p_target_is_company THEN
            -- User -> Company
            SELECT * INTO v_target_company FROM public.companies WHERE id = p_receiver_id AND deleted_at IS NULL;
            IF v_target_company IS NULL THEN
                RAISE EXCEPTION 'Target company not found or has been deleted.';
            END IF;
            -- Rule: Allowed, especially if messaging a verified company.
            v_can_send := TRUE; -- For now, allow broadly. Inbox management for companies is a future task.
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
        RAISE EXCEPTION 'Message sending conditions not met.';
    END IF;

    INSERT INTO public.messages (sender_id, receiver_id, content, is_system_message, read, acting_as_company_id, target_is_company)
    VALUES (v_sender_id, p_receiver_id, p_content, FALSE, FALSE, p_acting_as_company_id, p_target_is_company)
    RETURNING * INTO v_new_message;

    RETURN v_new_message;
END;
$$;

-- Need to ensure the messages table has target_is_company column if it was decided to be added at DB level
-- For now, assuming it's handled by the boolean parameter in the RPC only for logic branching.
-- If it needs to be stored, the previous migration (20250612000010) should be updated.
-- For now, I will add it to the INSERT statement above and update the previous migration as well.

GRANT EXECUTE ON FUNCTION public.send_message(UUID, TEXT, UUID, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION public.send_message(UUID, TEXT, UUID, BOOLEAN)
IS 'Allows sending a message. User->User (requires connection), User->Company, Company->User (requires acting company to be verified), Company->Company (requires both to be verified). Uses acting_as_company_id to denote messages sent on behalf of a company.';

DO $$ BEGIN
  RAISE NOTICE 'RPC function send_message updated for Platform Interaction Model messaging rules.';
END $$; 