# Administrator System

## 1. Purpose

Administrators (Admins) in the CanDo Business Network platform are privileged users responsible for system oversight, content moderation (including reviewing flagged posts and comments), managing company verifications, and potentially other sensitive operations. Their role is crucial for maintaining the platform's integrity, safety, and adherence to policies.

## 2. Admin Identification

Admin identification is handled differently at the backend (for database RLS and secure functions) and frontend (for UI access).

### 2.1. Backend Admin Identification: `internal.is_admin(user_id)`

-   **Core Mechanism**: The primary way the system identifies an administrator at the database level is through the SQL function `internal.is_admin(p_user_id uuid)`.
-   **Current Logic**: This function (defined in `supabase/migrations/20240510000002_secure_companies_access.sql`) currently checks if the `email` associated with the provided `p_user_id` in the `public.profiles` table matches a specific, predefined administrator email address (e.g., 'rmarshall@itmarshall.net').
-   **Usage**:
    -   It is used in Row Level Security (RLS) policies to grant admins broader access to tables (e.g., `public.companies`, `public.post_flags`, `public.comment_flags`).
    -   It is called by the `internal.ensure_admin()` helper function (defined in `supabase/migrations/20250515500000_create_ensure_admin_function.sql`), which is used at the beginning of `SECURITY DEFINER` RPCs to restrict execution to administrators only.

### 2.2. Frontend Admin Dashboard Access

-   **Mechanism**: Access to the Admin Dashboard UI (typically `/admin`) is controlled by a client-side check within the frontend application.
-   **Implementation**: As seen in `cando-frontend/src/app/admin/page.tsx`, this often involves checking if the currently logged-in user's email is present in a predefined list of `ADMIN_EMAILS`.
-   **Distinction**: This frontend check is for UI visibility and navigation control. It does not grant database-level privileges; those are solely determined by the backend `internal.is_admin()` function and associated RLS policies.

## 3. Initial Administrator Setup

-   **Script**: The first administrator account (e.g., 'rmarshall@itmarshall.net') is intended to be set up using the `scripts/setup-admin.js` script.
-   **Process**: This script:
    1.  Attempts to sign in the predefined admin user. If the user doesn't exist or credentials fail, it attempts to sign them up.
    2.  Calls the `internal_upsert_profile_for_user` RPC to ensure a profile exists for this admin user.
-   **Outcome**: This creates a standard user in `auth.users` and a corresponding entry in `public.profiles`. The `internal.is_admin()` function will then recognize this user as an admin due to their email matching the one hardcoded in the function.

## 4. Managing Multiple Administrators

-   **Current Limitation**: The system, particularly the `internal.is_admin()` SQL function, is currently set up to recognize only the initially configured admin(s) (e.g., based on a specific email).
-   **Future Enhancements (Required for Scalability)**: To allow the initial admin to designate other users as administrators, or for a more flexible admin management system, the `internal.is_admin()` function's logic will need to be updated. Potential approaches include:
    1.  **Modifying `internal.is_admin()`**:
        -   Hardcoding a list of admin emails (less flexible).
        -   Changing it to query a dedicated `public.admin_users` table (e.g., `admin_users (user_id UUID PRIMARY KEY REFERENCES auth.users(id))`). The initial admin could then be given rights to add/remove users from this table.
    2.  **Using JWT Custom Claims**:
        -   Assign a custom claim (e.g., `app_metadata.role = 'admin'`) to admin users in Supabase Auth.
        -   Update `internal.is_admin()` to check for this claim: `auth.jwt() ->> 'app_metadata' ->> 'role' = 'admin'`. This is a common and robust approach.
-   **Impact**: Until such an enhancement is implemented, any new users, even if conceptually considered admins by the initial admin, will not be recognized as such by database RLS policies or secure functions that rely on `internal.is_admin()`.

## 5. Administrator Privileges (Examples)

Administrators have special privileges across various parts of the platform, including but not limited to:

-   **Company Verification**: Approving or rejecting company verification submissions, adding admin notes. (See `Documentation/CompanyVerification.md`).
-   **Content Flagging**: Reviewing flagged posts and comments, updating flag statuses, removing content, and adding admin notes to flags. (See `Documentation/ContentFlaggingSystem.md`).
-   **Access to Admin Dashboard**: Viewing platform statistics and accessing administrative tools. (See `Documentation/AdminDashboard.md`).

This document serves as the primary reference for understanding how administrator roles and privileges are defined and managed within the system. 