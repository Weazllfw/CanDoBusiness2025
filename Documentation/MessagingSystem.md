# Messaging System Documentation

This document outlines the architecture and components of the user-to-user messaging system, including the automated welcome message feature.

## 1. Database Schema & Core Table (`public.messages`)

The core of the messaging system is the `public.messages` table.

**Definition (`supabase/migrations/20240509000000_create_simple_messaging.sql`):**
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

**Key Columns:**
- `id`: Primary key for the message.
- `created_at`: Timestamp of message creation.
- `sender_id`: UUID of the user who sent the message (references `auth.users.id`).
- `receiver_id`: UUID of the user who received the message (references `auth.users.id`).
- `content`: Text content of the message.
- `read`: Boolean flag indicating if the receiver has read the message.

**Indexes:**
- `messages_sender_id_idx` on `sender_id`.
- `messages_receiver_id_idx` on `receiver_id`.
- `messages_created_at_idx` on `created_at` (descending).

**Row Level Security (RLS) Policies:**
-   **SELECT (`"Users can view their own messages"`):**
    ```sql
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id)
    ```
    Allows users to select messages where they are either the sender or the receiver.
-   **INSERT (`"Users or System can send messages"`):**
    ```sql
    WITH CHECK (
      (auth.uid() = sender_id) OR
      (
        session_user = 'postgres' AND
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE public.profiles.id = sender_id AND public.profiles.email = 'rmarshall@itmarshall.net'
        )
      )
    )
    ```
    - Allows authenticated users to insert messages where they are the `sender_id`.
    - Allows operations performed by the `postgres` database user (e.g., `SECURITY DEFINER` trigger functions) to insert messages if the `sender_id` matches the user profile associated with the system admin email (`rmarshall@itmarshall.net`). This is crucial for the welcome message.
-   **UPDATE (`"Users can mark their received messages as read"`):**
    ```sql
    USING (auth.uid() = receiver_id)
    WITH CHECK (auth.uid() = receiver_id AND read = true)
    ```
    Allows users to update messages only if they are the `receiver_id` and the update is to set `read = true`.

**Realtime Configuration (`supabase/migrations/20240510000000_configure_realtime_for_messages.sql`):**
-   `ALTER TABLE public.messages REPLICA IDENTITY FULL;`
    -   Ensures that full row data is available for Realtime events (inserts, updates, deletes).
-   `ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;`
    -   Explicitly adds the `public.messages` table to the Supabase Realtime publication, ensuring changes are broadcast.

## 2. Supporting Database Objects

**2.1. `public.message_view` (`supabase/migrations/20240509000000_create_simple_messaging.sql`)**
-   A view that joins `public.messages` with `public.profiles` for both sender and receiver to provide richer message data including names and avatar URLs.
    ```sql
    CREATE OR REPLACE VIEW public.message_view AS
    SELECT
        m.id, m.created_at, m.content, m.sender_id, m.receiver_id, m.read,
        sender_profile.name AS sender_name,
        sender_profile.avatar_url AS sender_avatar,
        receiver_profile.name AS receiver_name,
        receiver_profile.avatar_url AS receiver_avatar
    FROM public.messages m
    JOIN public.profiles sender_profile ON m.sender_id = sender_profile.id
    JOIN public.profiles receiver_profile ON m.receiver_id = receiver_profile.id;
    ```

**2.2. `public.get_conversations(p_current_user_id uuid)` Function (`supabase/migrations/20240509000000_create_simple_messaging.sql`)**
-   A SQL function (`SECURITY INVOKER`) that retrieves a list of conversations for the given user.
-   For each conversation, it returns:
    -   `other_user_id`, `other_user_name`, `other_user_avatar`
    -   `last_message_id`, `last_message_content`, `last_message_at`, `last_message_sender_id`
    -   `unread_count` (number of unread messages from the other user in that conversation).
-   It determines the "other user" in the conversation and ranks messages to find the latest one for each conversation.

**2.3. `public.profiles` Table (`supabase/migrations/20240508000001_create_profiles.sql`)**
-   Essential for storing user display names and avatar URLs.
-   Key columns: `id` (matches `auth.users.id`), `name`, `avatar_url`, `email`.

**2.4. `auth.users` Table**
-   Standard Supabase table for user authentication. Referenced by `public.messages`.

## 3. Welcome Message Feature

**3.1. Trigger Function: `public.send_welcome_message_to_new_user()` (`supabase/migrations/20240509000001_add_welcome_message_trigger.sql`)**
-   A `SECURITY DEFINER` PL/pgSQL function.
-   **Trigger Event:** Fires `AFTER INSERT ON public.profiles` for each new user profile.
-   **Logic:**
    1.  Retrieves the `system_user_id` by looking up the admin's email (`rmarshall@itmarshall.net`) in `public.profiles`.
    2.  Checks that the new user is not the system admin themselves.
    3.  Inserts a new message into `public.messages`:
        -   `sender_id`: The retrieved `system_user_id`.
        -   `receiver_id`: The ID of the newly created user profile (`NEW.id`).
        -   `content`: A predefined welcome message.
    4.  Includes `RAISE NOTICE` for logging and debugging.
    5.  Handles potential errors during message insertion gracefully without failing the main profile insertion.

**3.2. Trigger Definition:**
```sql
CREATE TRIGGER trigger_send_welcome_message
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.send_welcome_message_to_new_user();
```

## 4. Admin User Setup & Profile Management

To ensure the welcome message sender (system admin) has a consistent identity and profile details:

**4.1. `scripts/setup-admin.js`**
-   A Node.js script using `@supabase/supabase-js`.
-   **Purpose:** Creates or signs in the designated admin user (`rmarshall@itmarshall.net`).
-   **Process:**
    1.  Attempts to sign in the admin user.
    2.  If sign-in fails (e.g., "invalid login credentials"), it attempts to sign up the user.
    3.  Once the admin user's ID is obtained (either from sign-in or sign-up), it calls the `internal_upsert_profile_for_user` RPC.
-   This script is run manually after `supabase db reset` or when initializing the admin user.
-   It defines `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_USERNAME`, and `ADMIN_AVATAR_URL` (e.g., from `placehold.co`).

**4.2. `public.internal_upsert_profile_for_user` Function (`supabase/migrations/20240507000000_initial_schema.sql`)**
-   A `SECURITY DEFINER` PL/pgSQL function.
-   **Parameters:** `p_user_id UUID`, `p_email TEXT`, `p_name TEXT`, `p_avatar_url TEXT DEFAULT NULL`.
-   **Action:** Inserts a new record into `public.profiles` or updates an existing one (`ON CONFLICT (id) DO UPDATE`).
-   This ensures that the admin user (and any other user for whom this is called) has a profile entry with the correct details.

## 5. Frontend Components & Logic

The frontend messaging UI is primarily managed within `cando-frontend/src/components/messages/MessagesModal.tsx`.

**5.1. `cando-frontend/src/lib/hooks/useMessages.ts` (Conceptual)**
-   **Responsibilities (assumed based on usage):**
    -   Fetches the list of conversations for the current user by calling the `public.get_conversations` RPC.
    -   Fetches messages for a selected conversation (likely querying `public.message_view` with filters `sender_id`, `receiver_id`).
    -   Handles sending new messages by calling an RPC that inserts into `public.messages`.
    -   Subscribes to Supabase Realtime events on the `public.messages` table for new inserts, updating the conversation list and message views in real-time.
    -   Provides state for `conversations`, `currentMessages`, loading states (`isLoadingConversations`).

**5.2. `cando-frontend/src/components/messages/MessagesModal.tsx`**
-   The main component for the messaging interface, rendered as a modal dialog using Headless UI.
-   **State Management:**
    -   `selectedConversationId: string | null`: Stores the `other_user_id` of the currently active conversation.
    -   `messageText: string`: Stores the content of the message being typed.
-   **Effects & Logic:**
    -   An `useEffect` hook loads messages via `loadConversationMessages(selectedConversationId)` when `selectedConversationId` changes.
    -   A crucial `useEffect` hook **auto-selects the first conversation** if no conversation is currently selected and the `conversations` list is loaded and non-empty. This is key for displaying the welcome message to new users.
        ```javascript
        useEffect(() => {
          if (!selectedConversationId && conversations && conversations.length > 0) {
            const firstConv = conversations[0];
            if (firstConv && firstConv.other_user_id) {
              setSelectedConversationId(firstConv.other_user_id);
            }
          }
        }, [conversations, selectedConversationId]);
        ```
-   **Rendering:**
    -   Displays a list of "Recent conversations" using data mapped from the `conversations` array from `useMessages`. Each item shows the other user's avatar, name, last message snippet, and unread count.
    -   Displays the main chat area for the `activeConversationDetails` (derived from `selectedConversationId`):
        -   Header: Shows the other user's avatar and name.
        -   Message List: Renders messages from `currentMessages`.
        -   Input Area: For typing and sending new messages.
    -   Shows a "No conversation selected" message if `activeConversationDetails` is null.

**5.3. Other Supporting Components:**
-   `ThreadList.tsx`: Renders the list of conversation threads (used within `MessagesModal.tsx` and potentially `MessageClient.tsx`).
-   `MessageList.tsx`: Renders the list of individual messages within an active chat.
-   `MessageInput.tsx`: The text area and send button.
-   `ThreadHeader.tsx`: Displays the name and avatar of the other user in the active chat.

**5.4. `cando-frontend/src/app/messages/[otherUserId]/MessageClient.tsx`**
-   A client component designed for a page-based chat view (where `otherUserId` comes from URL params).
-   It also renders a `ThreadList` and a main chat area.
-   Previously, we attempted to add auto-redirect logic here, but this is less relevant if `MessagesModal.tsx` is the primary UI. The modal's internal auto-selection is now the effective mechanism.

**5.5. `cando-frontend/next.config.js`**
-   Configured with `images.remotePatterns` to allow image loading from external hostnames like `placehold.co` (used for the admin avatar placeholder).
    ```javascript
    images: {
      remotePatterns: [
        // ... other patterns
        {
          protocol: 'https',
          hostname: 'placehold.co',
          port: '',
          pathname: '/**',
        },
      ],
    },
    ```

## 6. Key Workflows

**6.1. New User Signup & Welcome Message:**
1.  A new user signs up via the application.
2.  Supabase authentication creates an entry in `auth.users`.
3.  The application logic (or a trigger on `auth.users`) creates a corresponding entry in `public.profiles`.
4.  The `AFTER INSERT ON public.profiles` trigger (`trigger_send_welcome_message`) fires.
5.  The `send_welcome_message_to_new_user()` function executes:
    a.  It looks up the system admin's user ID from `public.profiles` using the email `rmarshall@itmarshall.net`.
    b.  It inserts a welcome message into `public.messages` from the system admin to the new user. This insertion is allowed by the dynamic RLS policy.
6.  The new user opens the `MessagesModal`.
7.  `useMessages` fetches conversations; the welcome message thread is now present.
8.  The `useEffect` in `MessagesModal.tsx` auto-selects this first conversation.
9.  The welcome message is displayed to the new user.

**6.2. User-to-User Messaging:**
1.  User A opens `MessagesModal` and selects or starts a conversation with User B.
2.  User A types a message and clicks send.
3.  `handleSendMessage` in `MessagesModal.tsx` calls `sendMessage` from `useMessages`.
4.  `useMessages` makes an RPC call to an (assumed) backend function that inserts the message into `public.messages` with User A as `sender_id` and User B as `receiver_id`. This is allowed by the RLS policy.
5.  **Realtime Update:**
    a.  Supabase Realtime detects the insert on `public.messages`.
    b.  If User B has the `MessagesModal` open and is subscribed via `useMessages`, their UI updates to show the new message from User A in the correct conversation thread.
    c.  User A's UI also updates optimistically or via the same Realtime event.

This documentation should provide a good overview of the messaging system. 