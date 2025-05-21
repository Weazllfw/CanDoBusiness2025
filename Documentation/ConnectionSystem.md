# Connection System Implementation Plan

## 1. Overview

This document tracks the implementation of the user-to-user and company-to-company connection system. The system will allow users to connect with other users, and companies to connect with other companies.

## 2. Data Model & Backend (RPCs & Tables)

### 2.1. Core Tables

*   **`user_connections` Table:**
    *   `id` (uuid, primary key, default `uuid_generate_v4()`)
    *   `requester_id` (uuid, foreign key to `profiles.id`, not nullable) - User initiating the connection.
    *   `addressee_id` (uuid, foreign key to `profiles.id`, not nullable) - User receiving the request.
    *   `status` (enum: `PENDING`, `ACCEPTED`, `DECLINED`, `BLOCKED`, default `'PENDING'`, not nullable) - Current status of the connection request.
    *   `requested_at` (timestamp with time zone, default `now()`, not nullable) - When the request was made.
    *   `responded_at` (timestamp with time zone, nullable) - When the request was accepted or declined.
    *   `notes` (text, nullable) - Optional message sent with the request.
    *   **Constraints:**
        *   Check `requester_id <> addressee_id`.
        *   Unique constraint on `(requester_id, addressee_id)` to prevent duplicate active/pending requests (or handle by updating existing).
    *   **Indexes:** `(requester_id, addressee_id)`, `(addressee_id, requester_id)`, `status`.

*   **`company_connections` Table:**
    *   `id` (uuid, primary key, default `uuid_generate_v4()`)
    *   `requester_company_id` (uuid, foreign key to `companies.id`, not nullable) - Company initiating.
    *   `addressee_company_id` (uuid, foreign key to `companies.id`, not nullable) - Company receiving.
    *   `status` (enum: `PENDING`, `ACCEPTED`, `DECLINED`, `BLOCKED`, default `'PENDING'`, not nullable) - Internal status of the connection.
    *   `requested_at` (timestamp with time zone, default `now()`, not nullable) - When the request was made.
    *   `responded_at` (timestamp with time zone, nullable) - When the request was accepted/declined.
    *   `requested_by_user_id` (uuid, foreign key to `profiles.id`, not nullable) - User who initiated on behalf of `requester_company_id`.
    *   **Constraints:**
        *   Check `requester_company_id <> addressee_company_id`.
        *   Unique constraint on `(requester_company_id, addressee_company_id)`.
    *   **Indexes:** `(requester_company_id, addressee_company_id)`, `(addressee_company_id, requester_company_id)`, `status`.

### 2.2. Helper Functions/Views (SQL)

*   `internal.get_user_connections_symmetric(p_user_id uuid)`: View or function to get all *accepted* connections for a user, treating `requester_id` and `addressee_id` symmetrically.
*   `internal.get_company_connections_symmetric(p_company_id uuid)`: Similar for companies.

### 2.3. RPC Functions

*   **User Connections:**
    *   `send_user_connection_request(p_addressee_id uuid, p_message text default null)`
    *   `respond_user_connection_request(p_request_id uuid, p_response text)`: `p_response` can be 'accept' or 'decline'.
    *   `remove_user_connection(p_other_user_id uuid)`: Removes an accepted connection with `p_other_user_id`.
    *   `get_user_connection_status_with(p_other_user_id uuid)`: Returns status (PENDING_SENT, PENDING_RECEIVED, ACCEPTED, NONE, BLOCKED) between current user and `p_other_user_id`.
    *   `get_pending_user_connection_requests()`: Returns incoming pending requests for the current user.
    *   `get_sent_user_connection_requests()`: Returns outgoing pending requests for the current user.
    *   `get_user_network(p_user_id uuid)`: Returns list of accepted connections for a user.

*   **Company Connections (Operated by authorized users of the company):**
    *   `send_company_connection_request(p_acting_company_id uuid, p_target_company_id uuid)`: Current user acts on behalf of `p_acting_company_id`.
    *   `respond_company_connection_request(p_request_id uuid, p_response text)`: User acts on behalf of the addressee company.
    *   `remove_company_connection(p_acting_company_id uuid, p_other_company_id uuid)`
    *   `get_company_connection_status_with(p_acting_company_id uuid, p_other_company_id uuid)`
    *   `get_pending_company_connection_requests(p_acting_company_id uuid)`: For company admins.
    *   `get_sent_company_connection_requests(p_acting_company_id uuid)`: For company admins.
    *   `get_company_network_count(p_company_id uuid)`: Publicly visible count of accepted connections. (Not list of connections).
    *   `get_company_network_details(p_company_id uuid)`: For company admins to see details of connected companies.

## 3. Frontend Components & UI Flow

### 3.1. User Connections

*   **Profile Pages (others'):**
    *   "Connect" / "Request Sent" / "Respond to Request" / "Disconnect" button.
*   **Network Page (`/network/people` or similar):**
    *   Tabs: "My Connections", "Pending Incoming Requests", "Sent Requests".
    *   Search/filter users.
*   **Notifications:** For new requests, accepted requests.

### 3.2. Company Connections

*   **Company Profile Pages (others'):**
    *   If user is acting as a company admin: "Connect [Our Company] with [Target Company]" button.
        *   Confirmation dialog: "You are about to send a connection request from [Your Selected Company] to [Target Company]. Proceed?"
    *   Public display: "[Target Company] is connected to X other businesses."
*   **Company Dashboard (for admins of the company):**
    *   Section: "Business Network" or "Company Connections".
    *   Tabs: "Our Connections" (count only, or private list for admins), "Pending Incoming Requests", "Sent Requests".
*   **Notifications:** For company connection updates (for relevant company admins).

### 3.3. Top Bar Company Selector Interaction

*   The state of the company selector (which company the user is currently "acting as") is crucial for company connection actions.
*   Frontend logic needs to pass the `acting_company_id` to relevant RPCs if a company is selected. If no company is selected, company connection actions might be disabled or hidden.

## 4. Implementation Phases

### Phase 1: User Connections - Backend
    *   [x] **Table:** Create `user_connections` table migration (`requester_id`, `addressee_id`, `status`, `requested_at`, `responded_at`, `notes`).
    *   [x] **RLS:** Implement RLS for `user_connections`.
        *   Users can insert their own requests.
        *   Users can update status of requests addressed to them (PENDING -> ACCEPTED/DECLINED).
        *   Users can delete/update their *sent* PENDING requests.
        *   Users can delete their *own side* of an ACCEPTED connection (effectively a disconnect).
        *   Authenticated users can read accepted connections where they are one of the parties.
    *   [x] **RPC:** `send_user_connection_request(p_addressee_id uuid, p_message text default null)`
    *   [x] **RPC:** `respond_user_connection_request(p_request_id uuid, p_response text)` ('accept'/'decline')
    *   [x] **RPC:** `remove_user_connection(p_other_user_id uuid)`
    *   [x] **RPC:** `get_user_connection_status_with(p_other_user_id uuid)`
    *   [x] **RPC:** `get_pending_user_connection_requests()` (incoming)
    *   [x] **RPC:** `get_sent_user_connection_requests()` (outgoing)
    *   [x] **RPC:** `get_user_network(p_user_id uuid)` (list of accepted connections: user profiles)
    *   [ ] Seed data for testing. *(Marked as to-do for now, will be part of testing/later phase)*

### Phase 2: User Connections - Frontend
    *   [ ] **Component:** `UserConnectButton.tsx` (handles different states: Connect, Pending, Respond, Disconnect).
    *   [ ] **Integration:** Place `UserConnectButton` on user profile cards/pages.
    *   [ ] **Page:** `/network/people` (or similar) to display pending requests (incoming/outgoing) and accepted connections.
    *   [ ] **Notifications:** Basic notifications for "new connection request" and "connection request accepted."

### Phase 3: Company Connections - Backend
    *   [x] **Table:** Create `company_users` table migration (`20250602000004_create_company_users_table.sql`) - links users to companies with roles.
    *   [x] **Table:** Create `company_connections` table migration (`20250602000005_create_company_connections_table.sql`) (`requester_company_id`, `addressee_company_id`, `status`, `requested_at`, `responded_at`, `requested_by_user_id`).
    *   [x] **RLS:** Implement RLS for `company_connections` (depends on `company_users`).
    *   [x] **RPC:** Create company connection RPCs migration (`20250602000006_create_company_connection_rpcs.sql`) (depends on `company_users`).
        *   `send_company_connection_request(p_acting_company_id uuid, p_target_company_id uuid)`
        *   `respond_company_connection_request(p_request_id uuid, p_response text)`
        *   `remove_company_connection(p_acting_company_id uuid, p_other_company_id uuid)`
        *   `get_company_connection_status_with(p_acting_company_id uuid, p_other_company_id uuid)`
        *   `get_pending_company_connection_requests(p_acting_company_id uuid)`
        *   `get_sent_company_connection_requests(p_acting_company_id uuid)`
        *   `get_company_network_count(p_company_id uuid)`
        *   `get_company_network_details(p_company_id uuid)`
    *   [ ] Seed data for testing. *(Marked as to-do for now, will be part of testing/later phase)*

### Phase 4: Company Connections - Frontend
    *   [ ] **Component:** `CompanyConnectButton.tsx`
        *   Requires access to current user's selected company context.
        *   Includes confirmation dialog: "Connect [acting company] with [target company]?"
    *   [ ] **Integration:** Place `CompanyConnectButton` on company profile cards/pages.
    *   [ ] **Display:** Show "Connected to X other businesses" on company profiles.
    *   [ ] **Admin UI:** Section in company dashboard for managing connection requests (pending/sent/accepted - details might be private).
    *   [ ] **Notifications:** For company connection events (to relevant admins).

### Phase 5: Shared & Refinements
    *   [ ] **Global State:** Solidify how "acting as company" (selected company context) is managed and accessed globally in the frontend.
    *   [ ] **Permissions:** Ensure robust permission checks (e.g., via `company_users` table and roles like 'admin', 'owner') for all company-related actions.
    *   [ ] **Blocking:** Implement blocking for user-user and company-company.
    *   [ ] **Edge Cases:** Deactivated/deleted users/companies.
    *   [ ] **UI Polish:** Consistent styling, loading states, error handling.
    *   [ ] **Testing:** Thorough end-to-end testing.

## 5. Existing Documentation Review

*   `NetworkingSystem.md`: May contain high-level concepts or previous thoughts.
*   `Companies.md`: For company structure, roles (`company_users`).
*   `CompanyVerification.md`: May relate to trust and how connections are perceived.
*   `TopBarNavigation.md`: For info on the company selector.

(Self-correction: I will review these documents in subsequent steps as I tackle relevant phases.)

## 6. Initial Focus: Phase 1 - User Connections Backend

The first logical step is to build the backend for user-to-user connections. This provides a foundational part of the system. 