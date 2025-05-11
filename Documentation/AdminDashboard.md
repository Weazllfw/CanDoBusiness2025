# Admin Dashboard Documentation

## 1. Overview

The Admin Dashboard provides administrators with tools to manage and oversee key aspects of the platform, with a primary focus on company verification and system statistics.

## 2. Access Control

-   Access to the Admin Dashboard page (`/admin`) is restricted to users whose email addresses are present in a predefined list (`ADMIN_EMAILS`) within the `cando-frontend/src/app/admin/page.tsx` component.
-   Users who are not logged in are redirected to the login page (`/auth/login`).
-   Logged-in users who are not on the `ADMIN_EMAILS` list are redirected to the main feed (`/feed`).

## 3. Key Features & Components

### 3.1. Company Verification Statistics

-   **Purpose**: Displays a summary of companies grouped by their current `verification_status`.
-   **Data Source**: Fetches data by calling the `public.get_company_verification_stats()` SQL RPC function.
    -   This function is defined in `supabase/migrations/20250516000000_add_company_stats_function.sql`.
    -   It counts companies for each distinct `verification_status` found in the `public.companies` table.
-   **Display**: Statistics are typically shown as cards or a summary table, with each status (e.g., 'Unverified', 'Tier 1 Pending') and its corresponding count.
-   **Location**: Implemented in `cando-frontend/src/app/admin/page.tsx`.

### 3.2. Company Verification Table

-   **Purpose**: Provides a detailed table listing companies, allowing administrators to review their information and manage their verification status.
-   **Component**: `cando-frontend/src/components/admin/CompanyVerificationTable.tsx`.
-   **Functionality**:
    -   **Fetches Data**: Calls the `admin_get_all_companies_with_owner_info` RPC (defined in `supabase/migrations/20240510000003_admin_company_tools.sql`) to get a list of all companies including owner details, verification status, admin notes, business number, public presence links, and self-attestation status.
    -   **Displays Data**: Renders companies in a table with columns for:
        -   Company Name & Website
        -   Owner Name & Email
        -   Current Verification Status (e.g., 'UNVERIFIED', 'TIER1_PENDING', 'TIER1_VERIFIED')
        -   Admin Notes
        -   Business Number
        -   Self-Attestation Completed (e.g., as a checkmark)
        -   Public Presence Links (clickable links)
        -   Actions (e.g., "Edit" button)
    -   **Inline Editing (for Status & Notes)**:
        -   An "Edit" button for each row allows the admin to change the `verification_status` (via a dropdown) and `admin_notes` (via a textarea) for that company.
        -   "Save" and "Cancel" buttons appear during editing mode.
    -   **Saves Changes**: The "Save" button calls the `admin_update_company_verification` RPC with the `p_company_id`, `p_new_status`, and `p_new_admin_notes`.
        -   The `admin_update_company_verification` RPC (defined in `supabase/migrations/20240510000003_admin_company_tools.sql`) only updates `verification_status` and `admin_notes` in the database.
        -   *Note: Currently, if other fields like Business Number or Public Presence Links are made editable in the admin UI, their changes will not be persisted by this specific save action unless the RPC and frontend call are updated.*

## 4. Workflow (Admin Verification)

1.  An administrator navigates to the Admin Dashboard (`/admin`).
2.  The page verifies their admin status.
3.  Company verification statistics are displayed at the top.
4.  The "Company Verification Table" lists companies.
5.  The admin can review a company's submitted details (Business Number, Public Links, Self-Attestation) and its current `verification_status`.
6.  The admin clicks "Edit" for a specific company.
7.  They select a new `verification_status` from the dropdown (e.g., 'TIER1_VERIFIED', 'TIER1_REJECTED').
8.  They can add or update `admin_notes`.
9.  Clicking "Save" calls `admin_update_company_verification` to update the company's status and notes in the database.
10. The table reflects the updated status and notes. 