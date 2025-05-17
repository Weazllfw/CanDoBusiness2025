# Networking System

This document outlines the database schema and intended functionality for the user and company networking system within the CanDo Business Network.

## Purpose

The networking system enables users and companies to connect with each other in various ways, fostering a professional network. It supports:
*   Direct connections between individual users.
*   Users following companies.
*   Companies following other companies or establishing formal partnerships.

## Key Database Tables

The following tables are central to the networking system. For detailed RLS policies and column definitions, please refer to their respective migration files in `supabase/migrations/` (timestamps starting with `20250520*`).

*   **`public.user_connections`**: Manages direct connections between individual users. It tracks the `requester_id`, `addressee_id`, and the `status` of the connection (e.g., 'PENDING', 'ACCEPTED', 'DECLINED', 'BLOCKED').
    *   _Migration File:_ `20250520000004_create_user_connections_table.sql`

*   **`public.user_company_follows`**: A join table that records which users are following which companies. This is a unilateral action (following).
    *   _Migration File:_ `20250520000005_create_user_company_follows_table.sql`

*   **`public.company_to_company_connections`**: Manages connections between two companies. It tracks the `source_company_id`, `target_company_id`, and `connection_type TEXT` (e.g., 'FOLLOWING', 'PARTNERSHIP_REQUESTED'). The `connection_type` itself implies the nature and state of the connection.
    *   _Migration File:_ `20250520000006_create_company_to_company_connections_table.sql`

## Functionality Highlights

*   **User-to-User:** Connection requests, accept/decline workflows, ability to remove/block connections.
*   **User-to-Company:** Simple follow/unfollow mechanism.
*   **Company-to-Company:** Simple follow/unfollow, plus a request/accept/decline workflow for partnerships. RLS policies ensure these actions are performed by authorized company owners.
*   **Data for Feeds:** These connection and follow relationships will be crucial for populating user feeds with relevant content from their network.

## Future Enhancements

*   RPCs for managing connection requests, follow/unfollow actions, and partnership proposals.
*   Notifications for new connection requests, accepted connections, new followers, etc.
*   Frontend UI components for displaying connection lists, follower counts, company profiles with follow/connect buttons, and managing connection requests.
*   Integration with the Company Directory and Search feature. 