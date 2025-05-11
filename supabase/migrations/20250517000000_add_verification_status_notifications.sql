-- Migration: Add automated messaging for company verification status changes

-- Re-define the function for admins to update company verification status and notes,
-- now including sending a message to the company owner AND deleting Tier 2 documents.
CREATE OR REPLACE FUNCTION public.admin_update_company_verification(
  p_company_id UUID,
  p_new_status VARCHAR(20),
  p_new_admin_notes TEXT
)
RETURNS public.companies -- Returns the updated company row
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal, storage -- Add storage to search_path
AS $$
DECLARE
  updated_company public.companies%ROWTYPE;
  company_to_update public.companies%ROWTYPE;
  system_user_id uuid;
  company_owner_id uuid;
  -- System user\'s email to look up in profiles. Ensure this profile exists.
  admin_profile_email TEXT := 'rmarshall@itmarshall.net'; 
  message_content TEXT;
  status_display_name TEXT;
  v_tier2_doc_path TEXT;
  v_deleted_count INTEGER;
BEGIN
  IF NOT internal.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'User is not authorized to perform this action.';
  END IF;

  -- Fetch the current company details, especially for tier2_document_storage_path
  SELECT * INTO company_to_update FROM public.companies WHERE id = p_company_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Company with ID % not found when fetching for update.', p_company_id;
  END IF;

  -- Look up the system user ID for messaging.
  SELECT id INTO system_user_id FROM public.profiles WHERE email = admin_profile_email LIMIT 1;
  IF system_user_id IS NULL THEN
    RAISE WARNING 'Admin Notification: System user profile for email [%] not found. Verification update will proceed, but notification message will not be sent.', admin_profile_email;
  END IF;

  -- Update company status and admin notes
  UPDATE public.companies
  SET
    verification_status = p_new_status,
    admin_notes = p_new_admin_notes
  WHERE id = p_company_id
  RETURNING * INTO updated_company;

  IF NOT FOUND THEN -- Should not happen if previous select found it, but good practice
    RAISE EXCEPTION 'Company with ID % not found during update.', p_company_id;
  END IF;

  -- If Tier 2 status is being finalized (Verified or Rejected), delete the document and clear fields.
  IF (p_new_status = 'TIER2_FULLY_VERIFIED' OR p_new_status = 'TIER2_REJECTED') AND company_to_update.tier2_document_storage_path IS NOT NULL THEN
    v_tier2_doc_path := company_to_update.tier2_document_storage_path;
    RAISE NOTICE 'Tier 2 finalized for company ID %. Attempting to delete document at path: % from bucket tier2-verification-documents', p_company_id, v_tier2_doc_path;

    BEGIN
      -- Attempt to delete the object from storage.
      -- Note: The storage.delete_object function expects the bucket name and the object path.
      -- Supabase storage paths usually don't start with 'public/' when passed to API, but from within DB, check expectations.
      -- Assuming v_tier2_doc_path is the full path within the bucket.
      SELECT count(*) INTO v_deleted_count FROM storage.delete_object('tier2-verification-documents', v_tier2_doc_path);
      RAISE NOTICE 'Storage deletion attempt for %: % objects removed (expected 1 or 0 if already gone).', v_tier2_doc_path, v_deleted_count;

      -- Clear the document fields in the companies table
      UPDATE public.companies
      SET
        tier2_document_type = NULL,
        tier2_document_filename = NULL,
        tier2_document_storage_path = NULL,
        tier2_document_uploaded_at = NULL
      WHERE id = p_company_id;
      RAISE NOTICE 'Tier 2 document fields cleared for company ID %.', p_company_id;

    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Admin Notification: Failed to delete Tier 2 document at path [%] or clear fields for company ID %. SQLSTATE: %, SQLERRM: %. Manual cleanup may be required.', v_tier2_doc_path, p_company_id, SQLSTATE, SQLERRM;
        -- Do not let document deletion failure roll back the main transaction (status update and message).
    END;
  END IF;

  -- Send notification message (existing logic)
  IF system_user_id IS NOT NULL AND updated_company.owner_id IS NOT NULL THEN
    company_owner_id := updated_company.owner_id;
    IF system_user_id = company_owner_id THEN
      RAISE NOTICE 'Admin Notification: Company owner is the system user. No notification message sent to self for company ID %.', p_company_id;
    ELSE
      -- Get a more user-friendly display name for the status
      status_display_name := CASE p_new_status
        WHEN 'UNVERIFIED' THEN 'Unverified'
        WHEN 'TIER1_PENDING' THEN 'Tier 1 Pending Review'
        WHEN 'TIER1_VERIFIED' THEN 'Tier 1 Verified'
        WHEN 'TIER1_REJECTED' THEN 'Tier 1 Application Rejected'
        WHEN 'TIER2_PENDING' THEN 'Tier 2 Pending Review'
        WHEN 'TIER2_FULLY_VERIFIED' THEN 'Tier 2 Fully Verified'
        WHEN 'TIER2_REJECTED' THEN 'Tier 2 Application Rejected'
        ELSE p_new_status -- Fallback to the raw status if not mapped
      END;

      message_content := 'Your company, ' || updated_company.name || ', has had its verification status updated to: ' || status_display_name || '.';
      IF p_new_admin_notes IS NOT NULL AND trim(p_new_admin_notes) <> '' THEN
        message_content := message_content || ' Admin notes: ' || p_new_admin_notes;
      END IF;

      BEGIN
        INSERT INTO public.messages (sender_id, receiver_id, content)
        VALUES (system_user_id, company_owner_id, message_content);
        RAISE NOTICE 'Admin Notification: Message sent to user % regarding company % status change to %', company_owner_id, updated_company.name, p_new_status;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'Admin Notification: Failed to send message to user % for company %. SQLSTATE: %, SQLERRM: %', company_owner_id, p_company_id, SQLSTATE, SQLERRM;
          -- Do not let message failure roll back the main transaction
      END;
    END IF;
  END IF;

  RETURN updated_company;
END;
$$;

-- Note: The GRANT EXECUTE on this function should already exist from the previous migration.
-- If it were a brand new function, you\'d add:
-- GRANT EXECUTE ON FUNCTION public.admin_update_company_verification(UUID, VARCHAR(20), TEXT) TO authenticated, service_role;

DO $$ BEGIN
  RAISE NOTICE 'Function admin_update_company_verification updated to send notifications and handle Tier 2 document deletion.';
END $$; 