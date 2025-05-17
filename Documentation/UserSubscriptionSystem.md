# User-to-User Subscription System

This document outlines the database schema and intended functionality for the user-to-user subscription system, allowing users to subscribe to updates or content from other users.

## Purpose

The user-to-user subscription system is designed to:
*   Allow users to subscribe to (or "follow") other specific users on the platform.
*   Enable features like receiving notifications when a subscribed user posts new content or performs certain actions.
*   Provide data for curating personalized feeds or content digests based on a user's subscriptions.

## Key Database Table

The primary table for this system is `public.user_subscriptions`. For detailed RLS policies and column definitions, refer to its migration file.

*   **`public.user_subscriptions`**: Tracks which users (`subscriber_id`) are subscribed to which other users (`target_user_id`).
    *   _Migration File:_ `20250520000003_create_user_subscriptions_table.sql`
    *   Key columns: `subscriber_id` (FK to `auth.users`), `target_user_id` (FK to `auth.users`), `created_at`.
    *   Primary Key: `(subscriber_id, target_user_id)`.
    *   Includes a `CHECK` constraint to prevent users from subscribing to themselves.

## Integration and Workflow

*   **User Action:** Users can initiate a subscription to another user through the target user's profile page or other UI elements.
*   **RLS Policies:** Row Level Security is configured to allow users to manage their own subscriptions (i.e., subscribe or unsubscribe). Public read access might be available to see who subscribes to whom, or this could be restricted based on privacy settings.
*   **Application Logic:** The relationships in this table will be used by application logic (e.g., in RPCs, RLS for other tables, frontend UI) to:
    *   Generate notifications (e.g., "User X posted a new article").
    *   Filter or sort content in activity feeds.
    *   Display subscriber/subscribed counts on user profiles.

## Future Enhancements

*   RPCs for subscribing and unsubscribing from users.
*   Frontend UI components for user profiles showing subscribe/unsubscribe buttons, and lists of subscriptions/subscribers.
*   Batch notification system for subscribed events.
*   User-configurable privacy settings for their subscription lists.

---
*Original Note: The previous version of this document described a Stripe-based paid tier subscription system. That system, if implemented, would require a separate table (e.g., `user_payment_tiers` or `stripe_customer_subscriptions`) and is distinct from the user-to-user subscription mechanism established by the `20250520000003_create_user_subscriptions_table.sql` migration. This document has been updated to reflect the implemented user-to-user subscription feature.* 