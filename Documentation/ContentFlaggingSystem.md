# Content Flagging System

## 1. Purpose

The content flagging system allows users to report posts and comments that they believe violate community guidelines or platform terms of service. Reported content is then reviewed by administrators, who can take appropriate action.

## 2. Database Schema

The system introduces two new tables and an ENUM type to manage flags.

### 2.1. `flag_status_enum`

This ENUM type defines the possible statuses for a flag:

```sql
CREATE TYPE public.flag_status_enum AS ENUM (
    'pending_review',       -- Default status when a flag is created.
    'resolved_no_action',   -- Admin reviewed, no action taken.
    'resolved_content_removed', -- Admin reviewed, content was removed.
    'resolved_user_warned', -- Admin reviewed, user was warned.
    'resolved_user_banned'  -- Admin reviewed, user was banned.
);
```

### 2.2. `post_flags` Table

Stores flags submitted for posts.

| Column        | Type                     | Constraints                                             | Description                                                                 |
|---------------|--------------------------|---------------------------------------------------------|-----------------------------------------------------------------------------|
| `id`          | `UUID`                   | Primary Key, default `gen_random_uuid()`                | Unique identifier for the flag.                                             |
| `post_id`     | `UUID`                   | Foreign Key to `public.posts(id)` ON DELETE CASCADE     | The post that was flagged.                                                  |
| `user_id`     | `UUID`                   | Foreign Key to `auth.users(id)` ON DELETE CASCADE       | The user who submitted the flag.                                            |
| `reason`      | `TEXT`                   | NULLABLE                                                | Optional reason provided by the user for flagging.                          |
| `status`      | `public.flag_status_enum`| NOT NULL, default `'pending_review'`                    | The current status of the flag.                                             |
| `created_at`  | `TIMESTAMPTZ`            | NOT NULL, default `now()`                               | Timestamp of when the flag was created.                                     |
| `reviewed_by` | `UUID`                   | Foreign Key to `auth.users(id)` ON DELETE SET NULL, NULLABLE | The admin user who reviewed and actioned the flag.                        |
| `reviewed_at` | `TIMESTAMPTZ`            | NULLABLE                                                | Timestamp when the flag was reviewed.                                       |
| `admin_notes` | `TEXT`                   | NULLABLE                                                | Internal notes made by an administrator during the review of the flag.    |
|               |                          | `UNIQUE (post_id, user_id)`                             | Ensures a user can only flag a specific post once.                          |

### 2.3. `comment_flags` Table

Stores flags submitted for comments. Structure is analogous to `post_flags`.

| Column        | Type                     | Constraints                                                 | Description                                                                 |
|---------------|--------------------------|-------------------------------------------------------------|-----------------------------------------------------------------------------|
| `id`          | `UUID`                   | Primary Key, default `gen_random_uuid()`                    | Unique identifier for the flag.                                             |
| `comment_id`  | `UUID`                   | Foreign Key to `public.post_comments(id)` ON DELETE CASCADE | The comment that was flagged.                                               |
| `user_id`     | `UUID`                   | Foreign Key to `auth.users(id)` ON DELETE CASCADE           | The user who submitted the flag.                                            |
| `reason`      | `TEXT`                   | NULLABLE                                                    | Optional reason provided by the user for flagging.                          |
| `status`      | `public.flag_status_enum`| NOT NULL, default `'pending_review'`                        | The current status of the flag.                                             |
| `created_at`  | `TIMESTAMPTZ`            | NOT NULL, default `now()`                                   | Timestamp of when the flag was created.                                     |
| `reviewed_by` | `UUID`                   | Foreign Key to `auth.users(id)` ON DELETE SET NULL, NULLABLE     | The admin user who reviewed and actioned the flag.                        |
| `reviewed_at` | `TIMESTAMPTZ`            | NULLABLE                                                    | Timestamp when the flag was reviewed.                                       |
| `admin_notes` | `TEXT`                   | NULLABLE                                                    | Internal notes made by an administrator during the review of the flag.    |
|               |                          | `UNIQUE (comment_id, user_id)`                              | Ensures a user can only flag a specific comment once.                       |

## 3. Row Level Security (RLS) Policies

RLS policies are in place for both `post_flags` and `comment_flags` tables:

### 3.1. For Regular Users (Authenticated)

-   **Create:** Users can insert new flags. The `user_id` of the flag must match their own `auth.uid()`.
-   **Read:** Users can only select flags that they themselves submitted.
-   **Update:** Users can update the `reason` for their own flags *only if* the flag's `status` is currently `'pending_review'`.
-   **Delete:** Users can delete their own flags *only if* the flag's `status` is currently `'pending_review'` (allowing them to retract a flag).

### 3.2. For Administrators

-   **Full Access:** Users identified as administrators by the `internal.is_admin(auth.uid())` SQL function have full `SELECT`, `INSERT`, `UPDATE`, and `DELETE` permissions on all flags in both tables.
-   **Current Admin Identification:** The `internal.is_admin(user_id)` function currently identifies administrators based on criteria established in earlier migrations (e.g., by checking against a specific email address like 'rmarshall@itmarshall.net' associated with the `user_id`).
-   **Future Admin Management:** Enhancements to allow the initial admin (or a system process) to designate other users as administrators will require updating the logic within `internal.is_admin()` or the underlying mechanism it uses to check for admin privileges (e.g., by having it query a dedicated `admin_users` table or check for a specific JWT custom claim). Until such changes, only the initially configured admin(s) recognized by `internal.is_admin()` can perform administrative actions on flags.

## 4. Migration File

The schema and RLS policies for the content flagging system are defined in the following migration file:
-   `supabase/migrations/20250524000000_create_content_flagging_tables.sql`

## 5. Next Steps (Frontend Implementation)

-   Add UI elements (e.g., "Flag" buttons/icons) to posts and comments.
-   Develop a modal or form for users to provide a reason when submitting a flag.
-   Implement client-side functions (e.g., in `src/lib/flags.ts` or `src/lib/posts.ts`) to create flags via Supabase.
-   Build an interface within the Admin Dashboard (`/admin`) for administrators to:
    -   View lists of flagged posts and comments.
    -   Filter flags by status (e.g., 'pending_review').
    -   Review flagged content and associated user-submitted reasons.
    -   Update the status of flags (e.g., to 'resolved_content_removed').
    -   Add internal administrator notes (`admin_notes`) to flags. 