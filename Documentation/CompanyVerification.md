# Company Verification Process

## 1. Overview

The company verification system allows users to submit their company details for review and administrators to validate these profiles. This process helps maintain the integrity and trustworthiness of businesses listed on the platform. Verified companies may gain access to additional features or be displayed more prominently. The system supports multiple tiers of verification.

## 2. Backend Details

### 2.1. Key Schema Fields (in `public.companies`)

-   **`verification_status VARCHAR(25)`**: Stores the current verification state. Default: 'UNVERIFIED'.
    -   Possible values (defined by `check_verification_status` constraint):
        -   `UNVERIFIED` (Tier 0 - Default)
        -   `TIER1_PENDING` (User submitted for Tier 1)
        -   `TIER1_VERIFIED` (Admin approved Tier 1)
        -   `TIER1_REJECTED` (Admin rejected Tier 1)
        -   `TIER2_PENDING` (User submitted for Tier 2)
        -   `TIER2_FULLY_VERIFIED` (Admin approved Tier 2)
        -   `TIER2_REJECTED` (Admin rejected Tier 2)
-   **`admin_notes TEXT`**: For administrators to store internal notes regarding verification.
-   **`self_attestation_completed BOOLEAN`**: User confirms authorization and accuracy of submitted info (for Tier 1).
-   **`business_number TEXT`**: Company's official business registration number (for Tier 1).
-   **`public_presence_links TEXT[]`**: Array of URLs to public profiles/mentions (for Tier 1).
-   **Tier 2 Document Fields in `public.companies`** (populated after secure upload and relevant RPC calls):
    -   `tier2_submission_date TIMESTAMPTZ`: Timestamp when Tier 2 verification was submitted.
    -   `tier2_document_type TEXT`: Type of document provided for Tier 2.
    -   `tier2_document_filename TEXT`: Original filename of the Tier 2 document.
    -   `tier2_document_storage_path TEXT`: Path in Supabase storage for the Tier 2 document.
    -   `tier2_document_uploaded_at TIMESTAMPTZ`: Upload timestamp.
    -   `tier2_articles_of_incorporation_url TEXT`: Direct URL if this specific doc type was used.
    -   `tier2_business_license_url TEXT`: Direct URL if this specific doc type was used.
    -   `tier2_proof_of_address_url TEXT`: Direct URL if this specific doc type was used.
    -   `tier2_photo_id_url TEXT`: Direct URL if this specific doc type was used.

### 2.2. Key SQL Functions & RPCs

Details on how administrator privileges are determined can be found in `Documentation/AdministratorSystem.md`.

#### `internal.is_admin(p_user_id uuid)`
-   **Purpose**: Helper function to determine if a user is an administrator.
-   **Logic**: See `Documentation/AdministratorSystem.md` for details on current admin identification logic.
-   **File**: `supabase/migrations/20240510000002_secure_companies_access.sql`
    *Note: Many RPCs now use `internal.ensure_admin()` for stricter, exception-based enforcement of admin privileges.*

#### `public.request_company_tier1_verification(p_company_id UUID, p_business_number TEXT, p_public_presence_links TEXT[], p_self_attestation_completed BOOLEAN)`
-   **Purpose**: Allows a company owner to submit their company for Tier 1 verification.
-   **Action**: Updates the company record with the provided details (`business_number`, `public_presence_links`, `self_attestation_completed`) and sets `verification_status` to `TIER1_PENDING`.
-   **Security**: `SECURITY DEFINER`. Checks if the caller owns the company and if the company is eligible for application (status is 'UNVERIFIED' or 'TIER1_REJECTED').
-   **File**: `supabase/migrations/20250511000022_create_request_tier1_verification_rpc.sql`

#### `admin_get_all_companies_with_owner_info()`
-   **Purpose**: Fetches a list of all companies with extended details for admin review.
-   **Returns**: `SETOF admin_company_details` (custom SQL type). Includes company info, owner details, verification status, admin notes, and Tier 1 fields.
-   **Security**: `SECURITY DEFINER`. Requires caller to be an admin. (Uses `internal.is_admin()` or `internal.ensure_admin()`).
-   **File**: `supabase/migrations/20240510000003_admin_company_tools.sql` (and updated by migrations that alter the `admin_company_details` type, e.g., `20240515000000_add_tiered_verification.sql`, `20250519000000_add_tier2_document_fields.sql`).

#### `admin_update_company_verification(p_company_id UUID, p_new_status VARCHAR, p_new_admin_notes TEXT)`
-   **Purpose**: Allows an administrator to update a company's `verification_status` and `admin_notes`. Also sends an automated message to the company owner notifying them of the status change and including any admin notes.
-   **Security**: `SECURITY DEFINER`. Requires caller to be an admin. (Uses `internal.is_admin()` or `internal.ensure_admin()`).
-   **Returns**: The updated `public.companies` row.
-   **File**: `supabase/migrations/20240510000003_admin_company_tools.sql` (and redefined in `supabase/migrations/20250517000000_add_verification_status_notifications.sql` to include messaging)

#### `public.request_company_tier2_verification(p_company_id UUID, p_tier2_document_type TEXT, p_tier2_document_filename TEXT, p_tier2_document_storage_path TEXT)`
-   **Purpose**: Allows a company owner (whose company is already Tier 1 Verified) to apply for Tier 2 verification by providing metadata of an already uploaded document.
-   **Action**: Updates the company record with the provided document details (`p_tier2_document_type`, `p_tier2_document_filename`, `p_tier2_document_storage_path`), sets `tier2_submission_date` and `tier2_document_uploaded_at` to `now()`, and changes `verification_status` to `TIER2_PENDING`.
-   **Security**: `SECURITY DEFINER`. Checks if the caller owns the company and if the company's status is `TIER1_VERIFIED`.
-   **File**: `supabase/migrations/20250518000000_create_request_tier2_verification_rpc.sql`

### 2.3. RLS and Security Considerations

-   **Admin-Only Access to Sensitive Data**: `admin_notes` are not in `public.companies_view`. Direct table access for admins is governed by RLS policies using `internal.is_admin()` (see `Documentation/AdministratorSystem.md`).
-   **Admin-Only Updates to Verification Fields**: Admins can update all company fields via RLS. The `admin_update_company_verification` RPC is the primary method for changing status.
-   **Preventing Owner Modification**: The trigger `internal.prevent_owner_update_restricted_company_fields()` (on `BEFORE UPDATE` of `public.companies`) blocks non-admin owners from directly changing `verification_status` or `admin_notes`. It allows updates originating from trusted `SECURITY DEFINER` functions (like the RPCs above).

## 3. Frontend User Interface

### 3.1. Company Applying for Tier 1 Verification

-   **Page**: `cando-frontend/src/app/company/[id]/apply-for-verification/page.tsx`
-   **Functionality**:
    -   Displays a form for `business_number`, `public_presence_links`, and `self_attestation_completed` checkbox.
    -   On submission, calls the `public.request_company_tier1_verification` RPC.
    -   Accessible if company status is 'UNVERIFIED' or 'TIER1_REJECTED'.

### 3.1.1. Company Applying for Tier 2 Verification (Conceptual)
-   **Eligibility**: Company must be `TIER1_VERIFIED`.
-   **Page**: A new page, likely `cando-frontend/src/app/company/[id]/apply-for-tier2-verification/page.tsx`.
-   **Functionality**:
    -   Clearly state Tier 2 requirements:
        -   Everything from Tier 1.
        -   Plus one of: Government-issued photo ID of business owner OR Proof of business address (e.g., utility bill, lease). Secure document upload required.
    -   Emphasize data handling: Documents are reviewed and then deleted immediately after verification decision. No long-term storage by the system beyond the review period.
    -   **Document Upload Step**: User first uploads the required document to a secure temporary location (e.g., `tier2-verification-documents` Supabase Storage bucket, to a path like `{company_id}/{guid_filename}`). The UI receives the `storage_path` and original `filename` upon successful upload.
    -   **Form Submission**: The user selects the `document_type` and the form then calls the `public.request_company_tier2_verification` RPC, passing `p_company_id`, the selected `p_tier2_document_type`, and the `p_tier2_document_filename` & `p_tier2_document_storage_path` obtained from the upload step.
    -   Inform the user that their application and document are submitted for review.
-   **Badge**: Upon successful verification, the company earns a "Fully Verified Business" badge/status.

### 3.2. Admin Dashboard Page (`cando-frontend/src/app/admin/page.tsx`)

-   **Access Control**: Restricted to users listed in `ADMIN_EMAILS`.
-   **Features**:
    -   Displays company verification statistics (counts by status) by calling `public.get_company_verification_stats()`.
    -   Includes the `CompanyVerificationTable` component.

### 3.3. Company Verification Table (`cando-frontend/src/components/admin/CompanyVerificationTable.tsx`)

-   **Purpose**: UI for administrators to manage company verifications.
-   **Functionality**:
    -   **Fetches & Displays Data**: Uses `admin_get_all_companies_with_owner_info` RPC. Shows company name, owner, submitted Tier 1 data, current status, and admin notes.
    -   **Inline Editing**: Allows admins to select a new `verification_status` from a dropdown and edit `admin_notes`.
    -   **Saves Changes**: Calls `admin_update_company_verification` RPC to save changes to status and notes.

## 4. Workflow

### 4.1. User Submits for Tier 1 Verification

1.  User navigates to the "Apply for Tier 1 Verification" page for their company.
2.  Fills in Business Number, Public Presence Links (optional), and checks the Self-Attestation box.
3.  Submits the form.
4.  Frontend calls `public.request_company_tier1_verification` RPC.
5.  RPC updates the company details and sets `verification_status` to `TIER1_PENDING`.

### 4.2. Admin Reviews Tier 1 Submission

1.  Admin navigates to the Admin Dashboard (`/admin`).
2.  Views companies, particularly those with `TIER1_PENDING` status, in the `CompanyVerificationTable`.
3.  Reviews the submitted `business_number`, `public_presence_links`, and `self_attestation_completed` status.
4.  Clicks "Edit" for the company.
5.  Selects a new `verification_status` (e.g., `TIER1_VERIFIED`, `TIER1_REJECTED`).
6.  Adds or updates `admin_notes`.
7.  Clicks "Save". Frontend calls `admin_update_company_verification` RPC.
8.  The company's status and notes are updated, and the table reflects these changes.

#### 4.2.1. Automated User Notification
Upon successful update of the company's verification status by an admin via the `admin_update_company_verification` RPC:
- An automated message is sent to the company owner.
- The message is sent from the system administrator account (e.g., 'rmarshall@itmarshall.net').
- The message content includes:
    - The company name.
    - The new verification status (e.g., "Tier 1 Verified", "Tier 1 Application Rejected").
    - Any administrator notes that were saved along with the status change.
- This notification is handled within the `admin_update_company_verification` RPC by inserting a record into the `public.messages` table.

### 4.3. User Submits for Tier 2 Verification
1.  Company owner (whose company is `TIER1_VERIFIED`) navigates to the "Apply for Tier 2 Verification" page.
2.  Reviews the Tier 2 requirements and data handling policy.
3.  **Uploads Document**: User uploads the required sensitive document (e.g., government ID or proof of address) using a secure file upload component. The component returns the storage path and original filename.
4.  **Submits Application**: User selects the document type and submits the application form.
5.  Frontend calls `public.request_company_tier2_verification` RPC, providing `p_company_id`, selected `p_tier2_document_type`, and the `p_tier2_document_filename` and `p_tier2_document_storage_path` from the upload.
6.  RPC checks eligibility (`TIER1_VERIFIED` status and ownership), stores the document metadata in `public.companies`, and sets `verification_status` to `TIER2_PENDING`.
7.  Frontend informs the user that their application is submitted and awaiting admin review.

### 4.4. Admin Reviews Tier 2 Submission
1.  Admin is notified (e.g., sees `TIER2_PENDING` status in the dashboard) that a company has applied for Tier 2.
2.  Admin securely receives and reviews the submitted documents (photo ID or proof of address) through the established secure channel.
3.  Admin verifies that the documents meet the requirements.
4.  In the `CompanyVerificationTable` on the Admin Dashboard, the admin clicks "Edit" for the company.
5.  Selects a new `verification_status` (`TIER2_FULLY_VERIFIED` or `TIER2_REJECTED`).
6.  Adds or updates `admin_notes` (potentially noting which type of document was reviewed).
7.  Clicks "Save". Frontend calls `admin_update_company_verification` RPC.
8.  The company's status and notes are updated.
9.  The automated user notification system sends a message to the company owner about the Tier 2 status update.
10. If successful, the company is now "Fully Verified."
11. **Document Handling**: The `admin_update_company_verification` RPC, when setting a final Tier 2 status (`TIER2_FULLY_VERIFIED` or `TIER2_REJECTED`), automatically attempts to delete the associated document from the `tier2-verification-documents` storage bucket and clears the related document path and metadata fields (`tier2_document_storage_path`, `tier2_document_type`, etc.) in the `public.companies` table. This aligns with the policy of not storing sensitive documents long-term.

This system provides a clear and controlled process for managing company verifications, enhancing the platform's reliability. 