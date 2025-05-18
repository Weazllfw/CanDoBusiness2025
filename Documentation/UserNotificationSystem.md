# User Notification System

**Version:** 1.0
**Date:** 2024-05-28

## 1. Overview

The User Notification System provides real-time notifications for important events and actions within the platform. It integrates with the header navigation to show unread notifications and allows users to view and manage their notifications through a dropdown interface.

## 2. Database Schema

### 2.1. Tables and Types

#### 2.1.1. `notification_type_enum`
```sql
CREATE TYPE public.notification_type_enum AS ENUM (
    'system_alert',
    'content_moderation',
    'new_message_summary',
    'connection_request',
    'rfq_update',
    'default'
);
```

#### 2.1.2. `user_notifications` Table
*   **Core Fields:**
    *   `id` UUID (PK)
    *   `user_id` UUID (FK to `public.profiles`)
    *   `notification_type` (`notification_type_enum`)
    *   `title` TEXT
    *   `message` TEXT
    *   `link_to` TEXT (nullable)
    *   `is_read` BOOLEAN
    *   `created_at` TIMESTAMPTZ
    *   `updated_at` TIMESTAMPTZ

### 2.2. RPC Functions

*   **`get_user_notifications(p_limit INT, p_page_number INT)`**
    *   Returns paginated notifications with unread count
    *   SECURITY INVOKER for RLS compliance

*   **`mark_notification_as_read(p_notification_id UUID)`**
    *   Marks single notification as read
    *   Returns updated notification

*   **`mark_all_notifications_as_read()`**
    *   Marks all user's unread notifications as read
    *   Returns success boolean

## 3. Frontend Implementation

### 3.1. Components

#### 3.1.1. `NotificationDropdown.tsx`
*   **Location:** `src/components/notifications/NotificationDropdown.tsx`
*   **Features:**
    *   Notification list with infinite scroll
    *   Real-time updates via Supabase subscriptions
    *   Mark as read functionality
    *   Click-through to related content
    *   Notification grouping by type
*   **Props:**
    ```typescript
    interface NotificationDropdownProps {
      isOpen: boolean;
      onClose: () => void;
    }
    ```
*   **State Management:**
    *   Local state for pagination
    *   Subscription management
    *   Read status tracking

### 3.2. Hooks and Utilities

#### 3.2.1. `useNotifications` Hook
*   **Location:** `src/lib/hooks/useNotifications.ts`
*   **Features:**
    *   Notification fetching and pagination
    *   Real-time subscription management
    *   Read status updates
    *   Unread count tracking
*   **API:**
    ```typescript
    interface UseNotificationsReturn {
      notifications: Notification[];
      unreadCount: number;
      isLoading: boolean;
      loadMore: () => Promise<void>;
      markAsRead: (id: string) => Promise<void>;
      markAllAsRead: () => Promise<void>;
    }
    ```

### 3.3. Integration Points

#### 3.3.1. Header Integration
*   Notification bell icon with unread count
*   Dropdown trigger
*   Real-time count updates

#### 3.3.2. Navigation
*   Click-through handling
*   Deep linking to related content
*   Back navigation handling

## 4. Notification Generation

### 4.1. System-Generated Notifications

*   **Content Moderation:**
    *   Post removal notifications
    *   Comment removal notifications
    *   User warnings
    *   Account status changes

*   **Company Verification:**
    *   Status change notifications
    *   Document review notifications
    *   Verification completion

*   **RFQ Updates:**
    *   New RFQ matches
    *   Quote responses
    *   Deadline reminders

### 4.2. User Interaction Notifications

*   **Social Features:**
    *   New followers/connections
    *   Post interactions
    *   Comment replies
    *   Company mentions

*   **Messaging:**
    *   New message summaries
    *   Group chat updates
    *   Message read receipts

## 5. Real-time Implementation

### 5.1. Supabase Configuration
*   Table configured for Realtime
*   Selective subscription setup
*   Proper RLS policies

### 5.2. Frontend Subscriptions
*   Subscription management in `useNotifications`
*   Efficient update batching
*   Error handling and reconnection

## 6. Performance Considerations

### 6.1. Optimization Techniques
*   Pagination with infinite scroll
*   Debounced real-time updates
*   Notification grouping
*   Read status batching

### 6.2. Caching Strategy
*   Local notification cache
*   Unread count caching
*   Optimistic updates

## 7. Security

### 7.1. Access Control
*   RLS policies for notification access
*   User-specific data isolation
*   Secure link generation

### 7.2. Data Protection
*   Sensitive data handling
*   Notification cleanup policies
*   Rate limiting

## 8. Future Enhancements

*   Push notification support
*   Enhanced notification grouping
*   Custom notification preferences
*   Advanced filtering options
*   Notification analytics
*   Mobile app integration 