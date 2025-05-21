# Messaging System Documentation

This document outlines the architecture and components of the user-to-user and user-to-company messaging system, including the automated welcome message feature and platform interaction model enhancements.

## 1. Database Schema & Core Table (`public.messages`)

The core of the messaging system is the `public.messages` table.

**Original Definition (`supabase/migrations/20240509000000_create_simple_messaging.sql`):**
```sql
CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content text NOT NULL,
    read boolean DEFAULT false NOT NULL
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
```

**Recent Modifications:**
*   **`acting_as_company_id` (`...000010_platform_interaction_model_schema_updates.sql`):**
    *   `acting_as_company_id UUID NULL REFERENCES public.companies(id)`: Allows a message to be sent on behalf of a company by an authorized user.
*   **`target_is_company` (`...000010_platform_interaction_model_schema_updates.sql`):**
    *   `target_is_company BOOLEAN DEFAULT FALSE`: Indicates if the `receiver_id` refers to a company (from `public.companies`) rather than a user.
*   **`updated_at` (`...000007_add_updated_at_to_messages.sql`):**
    *   `updated_at TIMESTAMPTZ DEFAULT now() NOT NULL`: Tracks the last update to the message.
    *   An accompanying trigger `trigger_update_messages_updated_at` automatically updates this field on any row update.

**Current Key Columns:**
- `id`: Primary key for the message.
- `created_at`: Timestamp of message creation.
- `updated_at`: Timestamp of last message update.
- `sender_id`: UUID of the user who initiated the message (references `auth.users.id`).
- `receiver_id`: UUID of the target user (from `auth.users.id`) or target company (from `public.companies.id`). The interpretation depends on `target_is_company`.
- `content`: Text content of the message.
- `read`: Boolean flag indicating if the receiver has read the message.
- `acting_as_company_id`: Optional UUID of the company on whose behalf the `sender_id` (user) is sending the message.
- `target_is_company`: Boolean indicating if `receiver_id` is a company ID.

**Indexes:** (Ensure these are still optimal with new query patterns)
- `messages_sender_id_idx` on `sender_id`.
- `messages_receiver_id_idx` on `receiver_id`.
- `messages_created_at_idx` on `created_at` (descending).
- Consider indexes on `(sender_id, acting_as_company_id)` and `(receiver_id, target_is_company)`.

**Row Level Security (RLS) Policies:**
-   **SELECT (`"Users can view their own messages"`):**
    The effective select permissions are now primarily determined by the logic within `public.get_conversations` and `public.get_messages_for_conversation` RPCs, which are `SECURITY DEFINER` and have internal logic to return only relevant messages to the caller. The original direct RLS policy on `public.messages` for SELECT might be simpler or act as a fallback:
    ```sql
    USING (
        (auth.uid() = sender_id AND acting_as_company_id IS NULL) OR -- User sent as themselves
        (EXISTS (SELECT 1 FROM company_users cu WHERE cu.company_id = acting_as_company_id AND cu.user_id = auth.uid() AND cu.role IN ('OWNER', 'ADMIN'))) OR -- User is admin of sending company
        (target_is_company = false AND auth.uid() = receiver_id) OR -- User received as themselves
        (target_is_company = true AND EXISTS (SELECT 1 FROM company_users cu WHERE cu.company_id = receiver_id AND cu.user_id = auth.uid() AND cu.role IN ('OWNER', 'ADMIN'))) -- User is admin of receiving company
    )
    ```
    *This policy should be reviewed to ensure it aligns with the access patterns of the new RPCs or if it can be simplified given the RPCs are `SECURITY DEFINER`.*
-   **INSERT:** Direct inserts into `public.messages` by users are now superseded by the `public.send_message` RPC. The RLS policy for INSERT should primarily cater to system-level functions (like the welcome message trigger if it still uses direct insert) or be very restrictive.
    The original policy:
    ```sql
    WITH CHECK (
      (auth.uid() = sender_id) OR
      (
        session_user = 'postgres' AND
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE public.profiles.id = sender_id AND public.profiles.email = internal.get_app_config('admin_email') -- Updated to use app_config
        )
      )
    )
    ```
-   **UPDATE (`"Users can mark their received messages as read"`):**
    Marking messages as read is now handled within the `public.get_messages_for_conversation` RPC. Direct updates to `read` status by users via RLS are unlikely. The RLS policy for UPDATE should be restrictive.

**Realtime Configuration (`supabase/migrations/20240510000000_configure_realtime_for_messages.sql`):**
-   `ALTER TABLE public.messages REPLICA IDENTITY FULL;`
-   `ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;`
    - Remains crucial for real-time updates.

## 2. Supporting Database Objects & RPCs

**2.1. Helper Functions**

*   **`internal.are_users_connected(p_user_id1 UUID, p_user_id2 UUID)` (`...000008_create_are_users_connected_function.sql`)**:
    *   Returns `BOOLEAN`. Checks if two users have an `ACCEPTED` connection in `public.user_connections`.
    *   Used by `send_message` to enforce user-to-user messaging rules.

*   **`internal.is_company_admin(p_user_id UUID, p_company_id UUID)` (existing, used by `send_message`)**:
    *   Checks if a user is an OWNER or ADMIN of a specified company.

*   **`public.get_user_administered_companies(p_user_id UUID)` (`...000000_create_get_user_administered_companies_rpc.sql`)**:
    *   `RETURNS TABLE (id UUID, name TEXT, avatar_url TEXT)`.
    *   Returns a list of companies for which the given user is an OWNER or ADMIN.
    *   Used by the frontend to populate the "Send as Company" selector.

**2.2. Core Messaging RPCs**

*   **`public.send_message(p_receiver_id UUID, p_content TEXT, p_acting_as_company_id UUID DEFAULT NULL, p_target_is_company BOOLEAN DEFAULT FALSE)` (`...000011_update_send_message_for_platform_interaction_model.sql`)**:
    *   **Replaces direct table inserts for user-initiated messages.**
    *   **Signature:**
        *   `p_receiver_id`: ID of the user or company receiving the message.
        *   `p_content`: Message text.
        *   `p_acting_as_company_id` (optional): ID of the company the sender is representing.
        *   `p_target_is_company` (default `FALSE`): Specifies if `p_receiver_id` is a company.
    *   **Key Logic & Permissions (governed by PlatformInteractionModel.md):**
        *   Gets `sender_id` via `auth.uid()`.
        *   **User-to-User:** If `p_acting_as_company_id` is NULL and `p_target_is_company` is FALSE -> Requires users to be connected (`internal.are_users_connected`).
        *   **User (as Company) to User:** If `p_acting_as_company_id` is NOT NULL and `p_target_is_company` is FALSE -> Sender must be admin of `p_acting_as_company_id`. Rules from `PlatformInteractionModel.md` apply (e.g., Verified Company to any user).
        *   **User to Company:** If `p_acting_as_company_id` is NULL and `p_target_is_company` is TRUE -> Rules from `PlatformInteractionModel.md` apply (e.g., User to any company they are connected with or follow, or any Verified Company).
        *   **User (as Company) to Company:** If `p_acting_as_company_id` is NOT NULL and `p_target_is_company` is TRUE -> Sender must be admin of `p_acting_as_company_id`. Rules from `PlatformInteractionModel.md` apply (e.g., Verified Company to any Verified Company).
        *   Prevents sending messages to oneself or one's own company.
        *   Inserts the message into `public.messages`.
        *   Returns the newly created message.

*   **`public.get_conversations()` (`...000012_update_get_conversations_for_platform_interaction.sql`)**:
    *   **Replaces the older `get_conversations(p_current_user_id uuid)` function.**
    *   Retrieves a list of conversations for the currently authenticated user (`auth.uid()`).
    *   **Returns:** `TABLE (partner_id UUID, partner_type TEXT, partner_name TEXT, partner_avatar_url TEXT, last_message_id UUID, last_message_content TEXT, last_message_at TIMESTAMPTZ, last_message_sender_id UUID, last_message_acting_as_company_id UUID, unread_count BIGINT)`
        *   `partner_id`: ID of the other user or company in the conversation.
        *   `partner_type`: 'user' or 'company'.
        *   `partner_name`, `partner_avatar_url`: Details of the partner.
        *   `last_message_*`: Details of the most recent message in the conversation.
        *   `unread_count`: Number of unread messages for the current user in that conversation.
    *   **Logic:** Identifies all messages involving the current user (as sender/receiver, personally or as company admin), groups them by partner, determines partner type, calculates unread counts, and gets the latest message for each partner.

*   **`public.get_messages_for_conversation(p_partner_id UUID, p_partner_type TEXT, p_page_number INT DEFAULT 1, p_page_size INT DEFAULT 20)` (`...000013_create_get_messages_for_conversation_rpc.sql`)**:
    *   **New RPC for fetching a paginated message history for a specific conversation.**
    *   **Parameters:** `p_partner_id`, `p_partner_type`, `p_page_number`, `p_page_size`.
    *   **Returns:** `TABLE (id UUID, content TEXT, created_at TIMESTAMPTZ, sender_id UUID, sender_name TEXT, sender_avatar_url TEXT, acting_as_company_id UUID, acting_as_company_name TEXT, acting_as_company_logo_url TEXT, target_is_company BOOLEAN, is_sent_by_current_user BOOLEAN)`
        *   Includes sender details (user and/or acting company) and `is_sent_by_current_user` flag.
    *   **Logic:** Identifies messages between the current user (or their admin'd companies) and the specified partner. Joins for names/avatars. Marks fetched messages as read for the current user/their admin'd companies. Orders by `created_at` descending and paginates.

**2.3. `public.message_view` (Largely Deprecated/Superseded)**
-   The original `public.message_view` is likely superseded by the richer data returned by `get_messages_for_conversation` and `get_conversations`. Its direct use might be limited.

**2.4. Welcome Message Feature (`public.send_welcome_message_to_new_user()` trigger)**
-   This feature should be reviewed for compatibility with the new messaging RPCs and platform interaction model. The `admin_email` used by the trigger is now configurable via `internal.get_app_config('admin_email')`, and the trigger should reflect this.

## 3. Frontend Implementation Overview (`cando-frontend/`)

The frontend messaging system has been significantly refactored to accommodate these backend changes.

**3.1. Core Hook: `src/lib/hooks/useMessages.ts`**
*   **State Management**:
    *   `Conversation` interface updated to reflect `public.get_conversations` return type:
        ```typescript
        export interface Conversation {
          partner_id: string;
          partner_type: 'user' | 'company';
          partner_name: string | null;
          partner_avatar_url: string | null;
          last_message_id: string | null;
          last_message_content: string | null;
          last_message_at: string | null;
          last_message_sender_id: string | null; // User ID of the sender of the last message
          last_message_acting_as_company_id?: string | null; // Company ID if last message sent as company
          unread_count: number;
        }
        ```
    *   `MessageView` interface updated to reflect `public.get_messages_for_conversation` return type:
        ```typescript
        export interface MessageView {
          id: string;
          content: string;
          created_at: string;
          sender_id: string; // User ID of the sender
          sender_name: string | null;
          sender_avatar_url: string | null;
          is_sent_by_current_user: boolean;
          acting_as_company_id?: string | null;    // Company context of the sender
          acting_as_company_name?: string | null;
          acting_as_company_logo_url?: string | null;
          target_is_company?: boolean; // Was the original message targeted at a company?
        }
        ```
*   **RPC Calls**:
    *   `fetchConversations`: Now calls the parameterless `public.get_conversations()`.
    *   `loadConversationMessages`: Signature changed to `(partnerId: string, partnerType: 'user' | 'company')`. Calls `public.get_messages_for_conversation` with these parameters and pagination.
    *   `sendMessage`: Signature changed to `(receiverId: string, content: string, actingAsCompanyId: string | null, targetIsCompany: boolean)`. Calls the updated `public.send_message` RPC.
*   **Realtime Handling**: Currently simplified to refetch conversations/messages on new message events. Future enhancements could involve more granular updates.
*   The hook also uses `supabase.rpc('get_user_administered_companies', { p_user_id: userId })` to fetch companies for the "Send as" feature, though this might be better placed in the component or a dedicated auth/user hook.

**3.2. Main UI: `src/components/messages/MessagesModal.tsx`**
*   **State**:
    *   Manages `selectedPartner` (object with `id` and `type: 'user' | 'company'`).
    *   `sendingAsCompanyId`: Stores the ID of the company selected from the new "Send as" dropdown.
    *   `administeredCompanies`: Stores the list of companies the user can send messages as, fetched using `public.get_user_administered_companies`.
*   **"Send as Company" Feature**:
    *   A `<select>` dropdown is displayed if `administeredCompanies` is not empty, allowing the user to choose between sending as "Yourself" or as one of their admin'd companies.
    *   Updates `sendingAsCompanyId` state on selection.
*   **Function Calls**:
    *   `loadConversationMessages` called with `selectedPartner.id` and `selectedPartner.type`.
    *   `sendMessage` called with `selectedPartner.id`, message text, `sendingAsCompanyId`, and `selectedPartner.type === 'company'` (for `targetIsCompany`).
*   **Rendering**:
    *   Conversation list (`ThreadList.tsx`) and active header (`ThreadHeader.tsx`) updated for new partner details (user/company name, avatar).
    *   Message rendering logic (`MessageList.tsx` and `MessageBubble`) updated to use `is_sent_by_current_user` for alignment and display sender info correctly, including "Company Name (User Name)" format if `acting_as_company_name` is present.

**3.3. Supporting Components**
*   **`ThreadList.tsx`**: Adapts to the new `Conversation` prop structure.
*   **`ThreadHeader.tsx`**: Props changed to `partnerName`, `partnerAvatarUrl`, `partnerType`.
*   **`MessageList.tsx` / `MessageBubble`**: Uses `is_sent_by_current_user` for alignment and displays company/user sender details based on `acting_as_company_...` fields.

**Note on Supabase Type Generation:**
During recent frontend updates, issues were encountered with Supabase type generation (`supabase gen types typescript --local`). This led to temporary workarounds like using `as any` for RPC calls and defining temporary types in frontend components. Resolving the type generation is crucial for long-term stability and type safety.

## 4. Platform Interaction Model Considerations

The messaging system now plays a key role in the `PlatformInteractionModel.md`. Key rules enforced by `public.send_message` include:
*   **User-to-User**: Requires an established connection.
*   **Company-to-User/Company & User-to-Company**: Generally requires specific conditions like company verification status, user trust levels, or existing relationships (connections/follows), as detailed in `PlatformInteractionModel.md`. The sender (if acting as a company) must be an admin/owner of that company.
*   The exact rules are detailed in `PlatformInteractionModel.md` and implemented within the `send_message` RPC.

This documentation provides a snapshot. Refer to the specific migration files and source code for the most detailed and up-to-date implementation.


## Original Content (Pre-Platform Interaction Model Updates - for reference)

(The original content of sections 3, 4, 5, and 6 regarding welcome messages, admin setup, and old frontend structure has been largely superseded or integrated into the new structure above. It can be referred to in the file history if needed but is omitted here for brevity as this document reflects the current system post-Platform Interaction Model updates.) 