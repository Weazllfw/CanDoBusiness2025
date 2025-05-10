# Company Verification Process

## 1. Overview

The company verification system allows administrators to review and validate company profiles submitted by users. This process helps maintain the integrity and trustworthiness of businesses listed on the platform. Verified companies may gain access to additional features or be displayed more prominently.

## 2. Backend Details

### 2.1. Key Schema Fields (in `public.companies`)

-   **`verification_status` (`VARCHAR(20)`):**
    -   Stores the current verification state of a company.
    -   Possible values: 'unverified' (default), 'pending', 'verified', 'rejected'.
    -   A `CHECK` constraint enforces these values.
    -   This field is primarily managed by administrators.
-   **`admin_notes` (`TEXT`):**
    -   Allows administrators to store internal notes regarding the verification process for a specific company (e.g., reasons for rejection, pending items, internal checks performed).
    -   This field is only visible to and editable by administrators.

### 2.2. Admin-Specific SQL Functions

These functions are `SECURITY DEFINER` and include a check using `internal.is_admin(auth.uid())` to ensure only authorized administrators can execute them.

#### `internal.is_admin(p_user_id uuid)`
-   **Purpose:** Helper function to determine if a user is an administrator.
-   **Logic:** Checks if the user's email in `public.profiles` matches a predefined admin email (e.g., 'rmarshall@itmarshall.net').
-   **File:** `supabase/migrations/20240510000002_secure_companies_access.sql`

#### `admin_get_all_companies_with_owner_info()`
-   **Purpose:** Fetches a comprehensive list of all companies, including their owner's details (email, name from `profiles`) and their current `verification_status` and `admin_notes`.
-   **Returns:** `SETOF admin_company_details` (a custom SQL type).
    ```sql
    CREATE TYPE admin_company_details AS (
      company_id uuid,
      company_name text,
      company_created_at timestamptz,
      company_website text,
      company_industry text,
      company_location text,
      owner_id uuid,
      owner_email text,
      profile_name text, -- from profiles.name
      verification_status character varying(20),
      admin_notes text
    );
    ```
-   **Usage:** Called by the admin dashboard to populate the company verification table.
-   **File:** `supabase/migrations/20240510000003_admin_company_tools.sql`

#### `admin_update_company_verification(p_company_id UUID, p_new_status VARCHAR, p_new_admin_notes TEXT)`
-   **Purpose:** Allows an administrator to update a company's `verification_status` and `admin_notes`.
-   **Parameters:**
    -   `p_company_id`: The ID of the company to update.
    -   `p_new_status`: The new verification status to set.
    -   `p_new_admin_notes`: The new admin notes to record.
-   **Returns:** The updated `public.companies` row.
-   **Usage:** Called by the admin dashboard when an admin saves changes to a company's verification details.
-   **File:** `supabase/migrations/20240510000003_admin_company_tools.sql`

### 2.3. RLS and Security Considerations

-   **Admin-Only Access to Sensitive Data:**
    -   The `admin_notes` column is not included in the `public.companies_view`, preventing non-admins from seeing it.
    -   Direct `SELECT` access to `public.companies` (which includes `admin_notes`) is restricted to admins by the policy: `CREATE POLICY "Admins can select all company data" ... USING (internal.is_admin(auth.uid()));`
-   **Admin-Only Updates to Verification Fields:**
    -   Direct `UPDATE` access to `public.companies` for all fields (including verification fields) is granted to admins: `CREATE POLICY "Admins can update any company" ... USING (internal.is_admin(auth.uid()));`
-   **Preventing Owner Modification:**
    -   The trigger `internal.prevent_owner_update_restricted_company_fields()` on `BEFORE UPDATE` of `public.companies` explicitly blocks non-admin owners from changing `verification_status` or `admin_notes`.

## 3. Frontend Admin Interface

### 3.1. Admin Dashboard Page (`cando-frontend/src/app/admin/page.tsx`)

-   **Access Control:** This page first verifies if the logged-in user is an admin by checking their email against a predefined list (`ADMIN_EMAILS`). If not an admin, the user is redirected.
-   **Layout:** Provides a general admin dashboard structure.
-   **Company Verification Section:** Includes a dedicated section that renders the `CompanyVerificationTable` component.

### 3.2. Company Verification Table (`cando-frontend/src/components/admin/CompanyVerificationTable.tsx`)

-   **Purpose:** Provides the UI for administrators to view and manage company verification statuses.
-   **Functionality:**
    -   **Fetches Data:** Calls the `admin_get_all_companies_with_owner_info` RPC to get the list of all companies and their details.
    -   **Displays Data:** Renders companies in a table with columns for:
        -   Company Name & Website
        -   Owner Name & Email
        -   Current Verification Status (styled badge)
        -   Admin Notes (truncated, full note on hover)
        -   Actions
    -   **Inline Editing:**
        -   An "Edit" button for each row allows the admin to change the `verification_status` (via a dropdown) and `admin_notes` (via a textarea) for that company.
        -   "Save" and "Cancel" buttons appear during editing.
    -   **Saves Changes:** The "Save" button calls the `admin_update_company_verification` RPC with the new status and notes.
    -   **State Management:** Handles loading, error, and editing states internally.

## 4. Workflow

1.  A user creates a company. The company's `verification_status` defaults to 'unverified'.
2.  An administrator navigates to the Admin Dashboard (`/admin`).
3.  The "Company Verification Table" lists all companies, showing their current status.
4.  The admin can review a company's details (potentially navigating to its public profile or website if links were provided).
5.  The admin clicks "Edit" for a specific company.
6.  They select a new `verification_status` from the dropdown (e.g., 'pending', 'verified', 'rejected').
7.  They can add or update `admin_notes`.
8.  Clicking "Save" updates the company's record in the database via the `admin_update_company_verification` RPC.
9.  The table reflects the updated status and notes.

This system provides a clear and controlled process for managing company verifications, enhancing the platform's reliability. 