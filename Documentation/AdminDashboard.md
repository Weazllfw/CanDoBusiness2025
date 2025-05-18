# Admin Dashboard Documentation

## 1. Overview

The Admin Dashboard provides administrators with tools to manage and oversee key aspects of the platform, focusing on company verification, content moderation, and system statistics.

## 2. Access Control

Access to administrator functionalities is managed at two levels:

-   **Frontend UI Access**: The Admin Dashboard page (`/admin`) restricts UI visibility by checking if the logged-in user's email is in the predefined `ADMIN_EMAILS` list in `cando-frontend/src/app/admin/page.tsx`.
-   **Backend Privileges**: Administrative privileges for accessing sensitive data or executing restricted actions are enforced at the database level through the `internal.is_admin(user_id)` SQL function and related mechanisms like `internal.ensure_admin()`.

For comprehensive details on administrator identification and management, refer to `Documentation/AdministratorSystem.md`.

## 3. Key Features & Components

### 3.1. Company Verification Statistics

-   **Purpose**: Displays a summary of companies grouped by their current `verification_status`.
-   **Data Source**: Fetches data via the `public.get_company_verification_stats()` SQL RPC function.
    -   Defined in `supabase/migrations/20250516000000_add_company_stats_function.sql`.
    -   Counts companies for each distinct `verification_status`.
-   **Display**: Statistics shown as cards with:
    -   Status name (formatted for display)
    -   Count of companies in that status
-   **Location**: Implemented in `cando-frontend/src/app/admin/page.tsx`.
-   **Navigation**: Includes a "Manage Company Verifications" link to `/admin/verifications`.

### 3.2. Content Flagging Statistics

-   **Purpose**: Provides an overview of flagged content requiring moderation.
-   **Data Source**: Fetches data via the `public.admin_get_flag_statistics()` SQL RPC function.
    -   Returns counts of flagged posts and comments by status.
-   **Display**: Statistics shown as cards with:
    -   Flag status (formatted for display)
    -   Count of flagged posts
    -   Count of flagged comments
-   **Navigation**: Includes a "Manage Flagged Content" link to `/admin/flags`.

### 3.3. Company Verification Table

-   **Component**: `cando-frontend/src/components/admin/CompanyVerificationTable.tsx`.
-   **Data Source**: Calls `admin_get_all_companies_with_owner_info` RPC.
-   **Features**:
    -   Displays comprehensive company information:
        -   Company details (name, website, location)
        -   Owner information
        -   Verification status and history
        -   Business documentation
        -   Tier-specific information
    -   Supports verification management:
        -   Status updates (UNVERIFIED, TIER1_PENDING, TIER1_VERIFIED, etc.)
        -   Admin notes
        -   Document downloads for Tier 2 verifications
    -   Real-time updates
    -   Error handling and loading states

### 3.4. Document Management

-   **Storage**: Uses 'tier2-verification-documents' bucket for verification documents.
-   **Security**: Implements RLS policies ensuring only admins can access documents.
-   **Features**:
    -   Document download functionality
    -   Automatic cleanup on status changes
    -   Support for multiple document types

## 4. Workflows

### 4.1. Company Verification Workflow

1.  Admin accesses dashboard (`/admin`)
2.  Views verification statistics
3.  Navigates to verification management
4.  Reviews company details and documentation
5.  Updates verification status and notes
6.  System automatically:
    -   Updates company status
    -   Sends notifications
    -   Manages related documents
    -   Updates statistics

### 4.2. Content Moderation Workflow

1.  Admin reviews flag statistics on dashboard
2.  Navigates to flagged content management
3.  Reviews flagged items
4.  Takes appropriate action:
    -   Updates flag status
    -   Removes content if necessary
    -   Issues warnings or bans
5.  System updates statistics and notifies relevant users

## 5. Error Handling

-   Comprehensive error handling for:
    -   Data fetching failures
    -   Document download issues
    -   Status update failures
-   User-friendly error messages
-   Logging for debugging
-   Graceful fallbacks for missing data

## 6. Security Considerations

-   All admin actions are logged
-   Document access is strictly controlled
-   Status changes trigger appropriate cleanup
-   Admin privileges are verified at both frontend and backend
-   Sensitive operations require explicit admin authorization 