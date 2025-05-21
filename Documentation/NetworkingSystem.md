# Networking System

## 1. Overview

The Networking System enables connections between users and companies within the platform. It supports both user-to-user and company-to-company relationships, facilitating business networking and collaboration opportunities.

## 2. Database Schema

### 2.1. User Connections

#### 2.1.1. `user_connections` Table
*   **Core Fields:**
    *   `id` UUID (PK, default `uuid_generate_v4()`)
    *   `requester_id` UUID (FK to `public.profiles`, not nullable) - User initiating the connection.
    *   `addressee_id` UUID (FK to `public.profiles`, not nullable) - User receiving the request.
    *   `status` public.connection_status_enum (default `'PENDING'`, not nullable)
    *   `notes` TEXT (nullable) - Optional message with the request.
    *   `requested_at` TIMESTAMPTZ (default `now()`, not nullable)
    *   `responded_at` TIMESTAMPTZ (nullable) - When the request was accepted/declined/blocked.

#### 2.1.2. `user_company_follows` Table
*   **Core Fields:**
    *   `id` UUID (PK, default `gen_random_uuid()`)
    *   `user_id` UUID (FK to `public.users(id)` - *Confirmed: aligns with `20250610000000_create_user_company_follows.sql` which uses `auth.users(id)` or `public.profiles(user_id)` depending on RLS context, but `user_company_follows.user_id` refers to `auth.users.id` directly in its FK constraint.*)
    *   `company_id` UUID (FK to `public.companies`)
    *   `created_at` TIMESTAMPTZ (default `now()`)
    *   `responded_at` TIMESTAMPTZ (nullable) - When the request was accepted/declined.

#### 2.2.2. `public.profiles` Table (Relevant to Networking)
*   The `public.profiles` table, while central to user identity, has fields relevant to how users are presented in network contexts:
    *   `id` UUID (PK, matches `auth.users.id`)
    *   `name` TEXT
    *   `avatar_url` TEXT
    *   `trust_level public.user_trust_level_enum` (Added by `...000010_platform_interaction_model_schema_updates.sql`)
    *   `is_verified BOOLEAN` (Added by `...000010_platform_interaction_model_schema_updates.sql`)

### 2.2. Company Connections

#### 2.2.1. `company_connections` Table
*   **Core Fields:**
    *   `id` UUID (PK, default `uuid_generate_v4()`)
    *   `requester_company_id` UUID (FK to `public.companies`, not nullable) - Company initiating.
    *   `addressee_company_id` UUID (FK to `public.companies`, not nullable) - Company receiving.
    *   `status` public.connection_status_enum (default `'PENDING'`, not nullable)
    *   `requested_by_user_id` UUID (FK to `public.profiles`, not nullable) - User who initiated on behalf of `requester_company_id`.
    *   `requested_at` TIMESTAMPTZ (default `now()`, not nullable)
    *   `responded_at` TIMESTAMPTZ (nullable) - When the request was accepted/declined.

### 2.3. Enums and Types

```sql
CREATE TYPE public.connection_status_enum AS ENUM (
    'PENDING',
    'ACCEPTED',
    'DECLINED', -- Was REJECTED
    'BLOCKED'
);
-- Removed company_connection_type_enum as it's not used in the current company_connections table
```

## 3. RPC Functions

### 3.1. User Connection RPCs (Refer to `ConnectionSystem.md` for detailed parameters)

*   **`public.send_user_connection_request(p_addressee_id UUID, p_message TEXT DEFAULT NULL)`**
    *   Initiates a connection request from the current user to `p_addressee_id`.
*   **`public.respond_user_connection_request(p_request_id UUID, p_response TEXT)`**
    *   Allows the current user (addressee) to 'accept' or 'decline' a pending request.
*   **`public.remove_user_connection(p_other_user_id UUID)`**
    *   Removes an accepted connection between the current user and `p_other_user_id`.
*   **`public.get_user_connection_status_with(p_other_user_id UUID)`**
    *   Checks and returns the connection status (e.g., PENDING_SENT, ACCEPTED) with `p_other_user_id`.
*   **`public.get_pending_user_connection_requests()`**
    *   Fetches incoming pending requests for the current user.
*   **`public.get_sent_user_connection_requests()`**
    *   Fetches outgoing pending requests made by the current user.
*   **`public.get_user_network(p_user_id UUID)`** (Updated by `...000001_update_get_user_network_with_profile_details.sql`)
    *   Returns profile details of users connected to `p_user_id`.
    *   **Now includes:** `trust_level` and `is_verified` for each connected user, in addition to `connection_id`, `user_id`, `name`, `avatar_url`, and `connected_since`.
    *   Respects the `is_network_public` privacy flag on the target user's profile.

### 3.2. Company Connection RPCs (Operated by authorized users - Refer to `ConnectionSystem.md` for detailed parameters)

*   **`public.send_company_connection_request(p_acting_company_id UUID, p_target_company_id UUID)`**
    *   Initiates a connection request from `p_acting_company_id` to `p_target_company_id`, performed by an authorized user of the acting company.
*   **`public.respond_company_connection_request(p_request_id UUID, p_response TEXT)`**
    *   Allows an authorized user of the addressee company to 'accept' or 'decline' a pending request.
*   **`public.remove_company_connection(p_acting_company_id UUID, p_other_company_id UUID)`**
    *   Removes an accepted connection between `p_acting_company_id` and `p_other_company_id`, performed by an authorized user.
*   **`public.get_company_connection_status_with(p_acting_company_id UUID, p_other_company_id UUID)`**
    *   Checks the connection status between two companies, for an authorized user of `p_acting_company_id`.
*   **`public.get_pending_company_connection_requests(p_for_company_id UUID)`**
    *   Fetches incoming pending requests for `p_for_company_id` (for its admins).
*   **`public.get_sent_company_connection_requests(p_from_company_id UUID)`**
    *   Fetches outgoing pending requests from `p_from_company_id` (for its admins).
*   **`public.get_company_network_count(p_company_id UUID)`**
    *   Publicly returns the number of accepted connections for a company.
*   **`public.get_company_network_details(p_acting_company_id UUID, p_target_company_id UUID DEFAULT NULL)`**
    *   Returns details of companies connected to `p_acting_company_id` or, if `p_target_company_id` is provided, specific details about the connection between `p_acting_company_id` and `p_target_company_id`. Used for listing a company's network and on the `/network/companies` page.
    *   *Note: Original doc had `p_target_company_id` as primary, but `p_acting_company_id` is the one performing the query for its network, or checking status with a target.* Corrected usage reflects fetching network for `p_acting_company_id`.

### 3.3. User-Company Follow RPCs (from `20250610000000_create_user_company_follows.sql`)
*   **`public.follow_company(p_company_id UUID)`**
    *   Allows the current user to follow the specified company.
*   **`public.unfollow_company(p_company_id UUID)`**
    *   Allows the current user to unfollow the specified company.
*   **`public.get_company_follow_status(p_user_id UUID, p_company_id UUID)`**
    *   Checks if `p_user_id` is following `p_company_id`. Returns boolean.
*   **`public.get_cymk_suggestions(p_requesting_user_id UUID, p_limit INT)`** (Used by suggestions component)
    *   Provides company suggestions for a user.

## 4. Frontend Implementation

### 4.1. User Networking: Page & Components

*   **`UserConnectButton.tsx` Component (`src/components/connections/UserConnectButton.tsx`)**
    *   Handles all user-to-user connection actions (Send Request, Accept, Decline, Cancel Sent Request, Disconnect).
    *   Dynamically renders button text and actions based on the connection status between the current user and a target user.
    *   Uses RPCs: `get_user_connection_status_with`, `send_user_connection_request`, `respond_user_connection_request`, `remove_user_connection`, `get_pending_user_connection_requests`, `get_sent_user_connection_requests`.
    *   Provides loading and error states, with toast notifications for feedback.
    *   Used on user profiles and within the user network management page.

*   **User Network Page (`src/app/network/people/page.tsx`)**
    *   Provides a tabbed interface for logged-in users to manage their network:
        *   **My Connections:** Lists accepted connections (data from `get_user_network`). Now includes trust level and verification status.
        *   **Incoming Requests:** Lists pending requests received by the user (data from `get_pending_user_connection_requests`). Profile data for requesters is enriched and should include trust/verification.
        *   **Sent Requests:** Lists pending requests sent by the user (data from `get_sent_user_connection_requests`). Profile data for addressees is enriched and should include trust/verification.
    *   Integrates `UserConnectButton.tsx` in each list item for relevant actions.
    *   Includes profile enrichment for displaying user names, avatars, trust levels, and verification badges.

### 4.2. Company Networking & Follows: Pages & Components

*   **Follow/Unfollow Button (on Company Profile Page)**
    *   **Location:** `src/app/company/[id]/page.tsx`
    *   **Functionality:** Allows logged-in users to follow or unfollow the company whose profile they are viewing.
    *   **Button State:** Dynamically changes between "Follow" and "Unfollow" based on the current status.
    *   **RPCs Used:** `get_company_follow_status` (to determine initial state), `follow_company`, `unfollow_company`.

*   **Follow Action (in Company Suggestions)**
    *   **Location:** `src/components/feed/suggestions/CompaniesYouMayKnow.tsx` (uses `src/components/feed/suggestions/SuggestionCard.tsx`).
    *   **Functionality:** Allows users to "Follow" companies presented in the "Companies you may know" feed suggestions.
    *   **Note:** Currently, this component only implements the "Follow" action. "Unfollow" from the suggestion card is not present.
    *   **RPCs Used:** `get_cymk_suggestions`, `get_company_follow_status`, `follow_company`.

*   **`CompanyConnectButton.tsx` Component (`src/components/connections/CompanyConnectButton.tsx`)**
    *   Handles all company-to-company connection actions (Send Request, Accept, Decline, Cancel Sent Request, Disconnect).
    *   Requires the current user to be an admin of the `actingCompanyId` (verified by `is_company_admin` RPC within the button logic).
    *   Dynamically renders based on connection status between `actingCompanyId` and `targetCompanyId`.
    *   Uses RPCs: `is_company_admin`, `get_company_connection_status_with`, `send_company_connection_request`, `respond_company_connection_request`, `remove_company_connection`, `get_pending_company_connection_requests`, `get_sent_company_connection_requests`.
    *   Provides loading/error states and toast notifications.
    *   Used on company profile pages and the company connection management page.

*   **Company Network Viewing Page (`src/app/network/companies/page.tsx`)**
    *   **Purpose:** Allows a user (acting as an admin of their currently active company) to view their company's established (accepted) connections.
    *   **Data Source:** Uses the `get_company_network_details` RPC (with `p_acting_company_id` being the user's active company) to fetch connected companies.
    *   **Features:** Displays a list of connected companies. Integrates `CompanyConnectButton.tsx` for each connection, allowing actions like "Disconnect".

*   **Company Connection Management Page (`src/app/company/[id]/connections/page.tsx`) - NEW**
    *   **Purpose:** A dedicated page for administrators of a specific company (identified by `[id]` in the URL) to manage their company's connections.
    *   **Access Control:** Verifies if the `currentUser` is an admin of the company `[id]` using the `is_company_admin` RPC. Shows an error or redirects if not authorized.
    *   **User Interface:** Provides a tabbed interface:
        *   **Incoming Requests:** Lists pending connection requests received by this company (data from `get_pending_company_connection_requests`). Uses `CompanyConnectButton` for "Accept" / "Decline" actions.
        *   **Sent Requests:** Lists pending connection requests sent by this company (data from `get_sent_company_connection_requests`). Uses `CompanyConnectButton` for "Cancel Request" action.
        *   **Current Connections:** Lists currently accepted connections for this company (data from `get_company_network_details`, filtered for 'ACCEPTED' status). Uses `CompanyConnectButton` for "Disconnect" action.
    *   **Linking:** This page is accessible via:
        *   A "Manage Connections" link on the company's profile page (`/company/[id]`), visible to its admins.
        *   A "Manage Connections" link on the user's company dashboard (`/dashboard/companies`) for each company they manage.

### 4.3. Hooks and Utilities

*   **Custom Hooks (e.g., `useUserConnections`, `useCompanyConnections`):**
    *   The initially planned custom hooks for managing connection state and abstracting RPC calls were **not implemented in that specific hook-based form**.
    *   Instead, data fetching, state management, and RPC interactions are primarily handled directly within the respective page components (e.g., `src/app/network/people/page.tsx`, `src/app/company/[id]/connections/page.tsx`) and the reusable action button components (`UserConnectButton.tsx`, `CompanyConnectButton.tsx`). These components encapsulate their specific logic and use `useCallback` and `useState` for managing their operations and state.

## 5. Security

### 5.1. RLS Policies

*   **User Connections:**
    *   Users can only view their own connections
    *   Connection requests require both parties' consent
    *   Blocked connections prevent further interactions

*   **Company Connections:**
    *   Company owners can manage partnerships
    *   Public read access for following relationships
    *   Protected write access for partnerships

### 5.2. Validation Rules

*   Prevent self-connections
*   Enforce connection limits
*   Validate user/company status
*   Check verification requirements

## 6. Notifications

### 6.1. User Notifications

*   New connection requests
*   Request responses
*   Connection updates
*   Profile changes

### 6.2. Company Notifications

*   New followers
*   Partnership requests
*   Partnership status changes
*   Company updates

## 7. Performance Considerations

### 7.1. Optimization

*   Connection count caching
*   Follower count caching
*   Selective real-time updates
*   Pagination implementation

### 7.2. Indexing

*   Compound indexes for efficient queries
*   Status-based indexes
*   Timestamp-based sorting

## 8. Future Enhancements

*   Enhanced connection recommendations
*   Connection strength metrics
*   Advanced partnership features
*   Network visualization
*   Integration with external platforms
*   Analytics and insights 