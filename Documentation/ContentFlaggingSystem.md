# Content Flagging System

## 1. Overview

The Content Flagging System enables users to report inappropriate content and provides administrators with tools to review and act on these reports. The system covers posts, comments, and potentially other user-generated content.

## 2. Database Schema

### 2.1. Tables

#### 2.1.1. `content_flags` Table
*   **Core Fields:**
    *   `id` UUID (PK)
    *   `reporter_id` UUID (FK to `public.profiles`)
    *   `content_type` content_type_enum
    *   `content_id` UUID
    *   `reason` flag_reason_enum
    *   `details` TEXT
    *   `status` flag_status_enum
    *   `admin_notes` TEXT
    *   `created_at` TIMESTAMPTZ
    *   `updated_at` TIMESTAMPTZ
    *   `resolved_at` TIMESTAMPTZ
    *   `resolved_by` UUID (FK to `public.profiles`)

### 2.2. Enums

```sql
CREATE TYPE content_type_enum AS ENUM (
    'post',
    'comment',
    'message',
    'profile'
);

CREATE TYPE flag_reason_enum AS ENUM (
    'spam',
    'harassment',
    'inappropriate',
    'offensive',
    'misinformation',
    'other'
);

CREATE TYPE flag_status_enum AS ENUM (
    'pending',
    'under_review',
    'resolved_no_action',
    'resolved_warning',
    'resolved_removed',
    'resolved_banned'
);
```

## 3. Frontend Components

### 3.1. User-Facing Components

#### 3.1.1. `FlagButton.tsx`
*   **Location:** `src/components/feed/FlagButton.tsx`
*   **Purpose:** Trigger for reporting content
*   **Features:**
    *   Accessible button design
    *   Integration with FlagModal
    *   Loading and success states
*   **Props:**
    ```typescript
    interface FlagButtonProps {
      contentType: ContentType;
      contentId: string;
      onFlagComplete?: () => void;
    }
    ```

#### 3.1.2. `FlagModal.tsx`
*   **Location:** `src/components/feed/FlagModal.tsx`
*   **Purpose:** Modal form for submitting reports
*   **Features:**
    *   Reason selection
    *   Additional details input
    *   Form validation
    *   Success/error handling
*   **Props:**
    ```typescript
    interface FlagModalProps {
      isOpen: boolean;
      onClose: () => void;
      contentType: ContentType;
      contentId: string;
    }
    ```

### 3.2. Admin Components

#### 3.2.1. Flag Review Interface
*   **Location:** `/admin/flags` route
*   **Features:**
    *   Flag list with filters
    *   Detailed view of flagged content
    *   Action buttons for resolution
    *   Admin notes field

## 4. RPC Functions

### 4.1. User Functions

*   **`flag_content`**
    ```sql
    CREATE OR REPLACE FUNCTION public.flag_content(
        p_content_type content_type_enum,
        p_content_id UUID,
        p_reason flag_reason_enum,
        p_details TEXT
    ) RETURNS UUID
    ```

### 4.2. Admin Functions

*   **`admin_review_flag`**
    ```sql
    CREATE OR REPLACE FUNCTION public.admin_review_flag(
        p_flag_id UUID,
        p_status flag_status_enum,
        p_admin_notes TEXT
    ) RETURNS VOID
    ```

*   **`admin_get_flags`**
    ```sql
    CREATE OR REPLACE FUNCTION public.admin_get_flags(
        p_status flag_status_enum[],
        p_limit INT,
        p_offset INT
    ) RETURNS TABLE (...)
    ```

## 5. Security

### 5.1. RLS Policies

*   **Content Flags:**
    ```sql
    -- Users can create flags
    CREATE POLICY "Users can create flags" ON public.content_flags
        FOR INSERT TO authenticated
        WITH CHECK (auth.uid() IS NOT NULL);

    -- Users can view their own flags
    CREATE POLICY "Users can view their own flags" ON public.content_flags
        FOR SELECT TO authenticated
        USING (auth.uid() = reporter_id);

    -- Admins can view all flags
    CREATE POLICY "Admins can view all flags" ON public.content_flags
        FOR ALL TO authenticated
        USING (auth.uid() IN (SELECT admin_user_id FROM public.admin_users));
    ```

### 5.2. Validation Rules

*   Rate limiting on flag creation
*   Duplicate flag prevention
*   Content existence validation
*   Admin action authorization

## 6. Workflows

### 6.1. User Workflow

1.  User clicks flag button on content
2.  Flag modal opens
3.  User selects reason and provides details
4.  System validates and submits flag
5.  User receives confirmation
6.  Optional notification when resolved

### 6.2. Admin Workflow

1.  Admin views flag queue
2.  Reviews flagged content
3.  Adds admin notes
4.  Selects resolution action
5.  System applies action
6.  Notifications sent to relevant users

## 7. Notifications

### 7.1. User Notifications

*   Flag submission confirmation
*   Flag resolution updates
*   Content removal notices
*   Warning notifications

### 7.2. Admin Notifications

*   New flag alerts
*   High-priority flag notifications
*   Resolution confirmation
*   Action result feedback

## 8. Performance

### 8.1. Optimization

*   Flag queue pagination
*   Efficient content loading
*   Caching strategies
*   Background processing

### 8.2. Monitoring

*   Flag volume metrics
*   Resolution time tracking
*   User behavior patterns
*   System performance

## 9. Future Enhancements

*   Machine learning for flag prioritization
*   Automated content analysis
*   Enhanced reporting analytics
*   Bulk action tools
*   Appeal system
*   Community moderation features 