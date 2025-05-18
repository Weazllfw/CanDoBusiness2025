# Administrator System

## 1. Purpose

Administrators (Admins) in the CanDo Business Network platform are privileged users responsible for:
- System oversight
- Content moderation (reviewing flagged posts and comments)
- Company verification management (Tier 1 and Tier 2)
- Platform integrity maintenance
- Policy enforcement

## 2. Admin Identification

### 2.1. Frontend Admin Identification

-   **Location**: `cando-frontend/src/app/admin/page.tsx`
-   **Mechanism**: Checks if the logged-in user's email is in `ADMIN_EMAILS` array
-   **Implementation**:
    ```typescript
    const ADMIN_EMAILS = ['rmarshall@itmarshall.net', 'anotheradmin@example.com'];
    // Used in useEffect to control UI access
    if (session.user?.email && ADMIN_EMAILS.includes(session.user.email)) {
      setIsAdmin(true);
      // Fetch admin data...
    }
    ```
-   **Purpose**: Controls UI visibility and navigation access
-   **Security Note**: This is a client-side check and must be backed by server-side validation

### 2.2. Backend Admin Identification

-   **Core Function**: `internal.is_admin(p_user_id uuid)`
-   **Location**: `supabase/migrations/20240510000002_secure_companies_access.sql`
-   **Implementation**: 
    - Checks if user's email matches predefined admin email(s)
    - Returns boolean indicating admin status
-   **Usage**:
    - Row Level Security (RLS) policies
    - Admin-only RPC functions
    - Secure data access control

### 2.3. Admin Authorization Helper

-   **Function**: `internal.ensure_admin()`
-   **Location**: `supabase/migrations/20250515500000_create_ensure_admin_function.sql`
-   **Purpose**: Standardized admin check for secure functions
-   **Usage**: Called at the start of SECURITY DEFINER functions
-   **Behavior**: Raises exception if user is not admin

## 3. Admin Privileges

### 3.1. Company Verification

-   **Access**: Full access to company verification system
-   **Capabilities**:
    - View all company details
    - Update verification status
    - Add admin notes
    - Access verification documents
    - Manage Tier 1 and Tier 2 verifications

### 3.2. Content Moderation

-   **Access**: Complete access to content flagging system
-   **Capabilities**:
    - View all flagged content
    - Update flag status
    - Remove content
    - Issue warnings
    - Ban users
    - View moderation statistics

### 3.3. Data Access

-   **Tables with Admin Access**:
    - `public.companies` (full access)
    - `public.post_flags` (full access)
    - `public.comment_flags` (full access)
    - `public.admin_actions_log` (write access)
    - `tier2-verification-documents` storage bucket

### 3.4. Administrative Functions

-   **Company Management**:
    - `admin_get_all_companies_with_owner_info()`
    - `admin_update_company_verification()`
    - `get_company_verification_stats()`

-   **Content Moderation**:
    - `admin_get_flag_statistics()`
    - `admin_get_post_flags()`
    - `admin_update_post_flag_status()`
    - `admin_get_comment_flags()`
    - `admin_update_comment_flag_status()`
    - `admin_remove_post()`
    - `admin_remove_comment()`
    - `admin_warn_user()`
    - `admin_ban_user()`

## 4. Security Implementation

### 4.1. Row Level Security (RLS)

-   **Policy Pattern**:
    ```sql
    CREATE POLICY "Admin full access" ON public.table_name
    FOR ALL USING (
      internal.is_admin(auth.uid())
    );
    ```
-   **Applied to**: All admin-accessible tables
-   **Ensures**: Only admins can perform privileged operations

### 4.2. Secure Functions

-   **Pattern**:
    ```sql
    CREATE OR REPLACE FUNCTION public.admin_function()
    RETURNS ... AS $$
    BEGIN
      PERFORM internal.ensure_admin();
      -- Function logic
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    ```
-   **Features**:
    - SECURITY DEFINER execution
    - Mandatory admin check
    - Proper error handling
    - Audit logging

### 4.3. Storage Security

-   **Bucket**: 'tier2-verification-documents'
-   **RLS Policies**:
    - Admin-only read access
    - Company-specific write paths
    - Automatic cleanup on status changes

## 5. Audit Trail

-   **Table**: `public.admin_actions_log`
-   **Tracked Information**:
    - Action type
    - Target type
    - Target ID
    - Admin ID
    - Timestamp
    - Action details
    - Previous state
-   **Purpose**: Maintain accountability and track changes

## 6. Future Enhancements

### 6.1. Multiple Admin Management

Current system uses hardcoded admin emails. Future improvements should consider:

1. **Admin Management Table**:
   ```sql
   CREATE TABLE public.admin_users (
     user_id UUID PRIMARY KEY REFERENCES auth.users(id),
     added_by UUID REFERENCES auth.users(id),
     added_at TIMESTAMPTZ DEFAULT now(),
     admin_level TEXT
   );
   ```

2. **JWT Custom Claims**:
   - Assign `app_metadata.role = 'admin'`
   - Update `internal.is_admin()` to check claims

3. **Admin Levels**:
   - Super Admin
   - Content Moderator
   - Company Verifier
   - Read-only Admin

These enhancements would provide more flexible and scalable admin management.

This document serves as the primary reference for understanding how administrator roles and privileges are defined and managed within the system. 