# Supabase Database Migrations Overview

This document provides a summary of the database migrations applied to the project. Migrations are ordered chronologically by their timestamp in the filename.

---

## `20240507000000_initial_schema.sql`

**Purpose:** Establishes the foundational database schema. Idempotent.

**Key Changes:**
*   Enables `pg_trgm` extension.
*   Creates core tables:
    *   `public.companies` with basic fields (`id`, `created_at`, `name`, `description`, `website`, `location`, `industry`, `owner_id`).
    *   `public.rfqs` with basic fields (`id`, `created_at`, `title`, `description`, `budget`, `currency`, `deadline`, `company_id`, `status`).
    *   Initial `public.posts` table (later replaced by `20250520000000_create_posts_table.sql`).
*   Adds indexes for foreign key relationships.
*   Implements RLS policies:
    *   Companies: Public read, owner CRUD.
    *   RFQs: Public read, company owner CRUD.
    *   Posts: Public read, company owner CRUD.
*   Creates helper functions:
    *   `public.get_user_companies(user_id UUID)` (SECURITY DEFINER).
    *   `public.internal_upsert_profile_for_user(p_user_id UUID, p_email TEXT, p_name TEXT, p_avatar_url TEXT)` (SECURITY DEFINER).

---

## `20240507000001_add_indexes.sql`

**Purpose:** Improves search performance on company names. Idempotent.

**Key Changes:**
*   Adds GIN trigram index on `public.companies.name` using `gin_trgm_ops`.

---

## `20240507000003_enhance_rfqs.sql`

**Purpose:** Significantly expands RFQ functionality with templates, invitations, quotes, and revisions. Idempotent.

**Key Changes:**
*   Enhances `public.rfqs` with new columns:
    *   `category`, `required_certifications TEXT[]`, `attachments TEXT[]`
    *   `preferred_delivery_date`, `visibility` (public/private/invited)
    *   `tags TEXT[]`, `requirements JSONB`, `updated_at`
*   Creates new tables:
    *   `public.rfq_templates`: Company-specific RFQ templates
    *   `public.rfq_invitations`: Tracks company invitations to RFQs
    *   `public.quotes`: Company responses to RFQs
    *   `public.quote_revisions`: Version history of quotes
*   Adds comprehensive indexes for performance.
*   Implements RLS policies for all new tables.
*   Creates functions and triggers:
    *   `public.get_rfq_statistics`: Calculates RFQ quote statistics
    *   Automatic `updated_at` maintenance
    *   Quote revision tracking

---

## `20240508000001_create_profiles.sql`

**Purpose:** Establishes user profile management. Idempotent.

**Key Changes:**
*   Creates `public.profiles` table:
    *   Primary key references `auth.users(id)`
    *   Fields: `name`, `email`, `avatar_url`, timestamps
*   Adds indexes:
    *   Standard index on `email`
    *   GIN trigram index on `name`
*   Implements RLS policies:
    *   Public read access
    *   Owner-only CRUD operations

---

## `20240508000002_add_company_avatar.sql`

**Purpose:** Adds company logo support. Idempotent.

**Key Changes:**
*   Adds `avatar_url TEXT` column to `public.companies`.

---

## `20240509000000_create_simple_messaging.sql`

**Purpose:** Implements direct messaging system. Idempotent.

**Key Changes:**
*   Creates `public.messages` table:
    *   Core fields: `id`, `created_at`, `sender_id`, `receiver_id`, `content`, `read`
    *   Foreign keys to `auth.users` for both sender and receiver
*   Adds performance indexes:
    *   `messages_sender_id_idx`
    *   `messages_receiver_id_idx`
    *   `messages_created_at_idx` (DESC)
*   Implements RLS policies:
    *   Users can view their sent/received messages
    *   Users can send messages (as sender)
    *   System user can send messages (for automated notifications)
    *   Recipients can mark messages as read
*   Creates `public.message_view`:
    *   Joins with profiles for sender/receiver details
    *   Includes names and avatar URLs
*   Creates `public.get_conversations` function:
    *   Returns conversation summaries
    *   Includes unread counts and latest messages

---

## `20240509000001_add_welcome_message_trigger.sql`

**Purpose:** Automates welcome messages for new users. Idempotent.

**Key Changes:**
*   Creates `public.send_welcome_message_to_new_user()` trigger function:
    *   SECURITY DEFINER
    *   Sends welcome message from system admin account
    *   Includes detailed logging/error handling
*   Creates `trigger_send_welcome_message` on `public.profiles`:
    *   Fires AFTER INSERT
    *   One welcome message per new user

---

## `20240510000000_configure_realtime_for_messages.sql`

**Purpose:** Enables real-time message updates. Idempotent.

**Key Changes:**
*   Sets `REPLICA IDENTITY FULL` on `public.messages`
*   Adds `public.messages` to Supabase Realtime publication
*   Ensures proper permissions for Realtime status checks
*   Includes fallback logic for different publication names

---

## `20240510000001_add_company_verification.sql`

**Purpose:** Adds basic company verification system. Idempotent.

**Key Changes:**
*   Adds to `public.companies`:
    *   `verification_status VARCHAR(20)` (default 'unverified')
    *   `admin_notes TEXT`
*   Adds constraint `check_verification_status`:
    *   Valid values: 'unverified', 'pending', 'verified', 'rejected'

---

## `20240510000002_secure_companies_access.sql`

**Purpose:** Implements comprehensive company data security. Idempotent.

**Key Changes:**
*   Creates `internal` schema for security functions
*   Creates `internal.is_admin(p_user_id uuid)` function:
    *   Checks if user has admin email
    *   SECURITY DEFINER for profile access
*   Creates `public.companies_view`:
    *   Public-safe view of company data
    *   Excludes sensitive fields like `admin_notes`
*   Updates `public.get_user_companies` to use view
*   Implements comprehensive RLS:
    *   Public read via view
    *   Owner CRUD with restrictions
    *   Admin full access
*   Adds trigger to prevent owners from modifying restricted fields

---

## `20240510000003_admin_company_tools.sql`

**Purpose:** Provides admin tools for company management. Idempotent.

**Key Changes:**
*   Creates `public.admin_company_details` composite type
*   Creates admin functions:
    *   `public.admin_get_all_companies_with_owner_info()`:
        *   Returns detailed company data with owner info
        *   SECURITY DEFINER with admin check
    *   `public.admin_update_company_verification`:
        *   Updates verification status and notes
        *   SECURITY DEFINER with admin check

---

## `20240510000004_enhance_company_profile.sql`

**Purpose:** Expands company profile data model. Idempotent.

**Key Changes:**
*   Adds new fields to `public.companies`:
    *   Address: `street_address`, `city`, `province`, `postal_code`
    *   Location: `major_metropolitan_area`
    *   Contact: `contact_person_name`, `contact_person_email`, `contact_person_phone`
    *   Services: `services TEXT[]`
*   Adds province validation constraint
*   Updates `public.companies_view`
*   Updates admin tools to include new fields

---

## `20240510000005_setup_logo_storage.sql`

**Purpose:** Configures secure company logo storage. Idempotent.

**Key Changes:**
*   Creates 'company-logos' storage bucket:
    *   5MB file size limit
    *   Allowed types: JPEG, PNG, GIF, WebP
*   Implements storage RLS policies:
    *   Public read access
    *   Owner-only upload/manage for their company
    *   Path structure: {company_id}/{filename}

---

## `20240514120000_add_other_metro_specify.sql`

**Purpose:** Enhances metropolitan area handling. Idempotent.

**Key Changes:**
*   Adds `other_metropolitan_area_specify TEXT` to `public.companies`
*   Removes legacy `location` field from views/types
*   Updates all dependent objects:
    *   `public.companies_view`
    *   `public.admin_company_details`
    *   `public.get_user_companies`
    *   `public.admin_get_all_companies_with_owner_info`

---

## `20240515000000_add_tiered_verification.sql`

**Purpose:** Implements multi-tier company verification system. Idempotent.

**Key Changes:**
*   Adds Tier 1 fields to `public.companies`:
    *   `self_attestation_completed BOOLEAN`
    *   `business_number TEXT`
    *   `public_presence_links TEXT[]`
*   Updates verification statuses:
    *   Standardizes existing to 'UNVERIFIED'
    *   New values: UNVERIFIED, TIER1_PENDING, TIER1_VERIFIED, TIER1_REJECTED, TIER2_PENDING, TIER2_FULLY_VERIFIED, TIER2_REJECTED
*   Updates all dependent objects:
    *   `public.companies_view`
    *   `public.admin_company_details`
    *   Admin functions
*   Maintains backwards compatibility with existing verification tools

---

## `20250511000022_create_request_tier1_verification_rpc.sql`

**Purpose:** Creates RPC for company owners to request Tier 1 verification. Idempotent.

**Key Changes:**
*   Creates `public.request_company_tier1_verification` function:
    *   Parameters: `p_company_id`, `p_business_number`, `p_public_presence_links`, `p_self_attestation_completed`
    *   SECURITY DEFINER with ownership and eligibility checks
    *   Updates company with Tier 1 details and sets status to 'TIER1_PENDING'
    *   Includes validation and error handling

---

## `20250511163540_fix_tier2_storage_policy_take2.sql`

**Purpose:** Configures secure storage for Tier 2 verification documents. Idempotent.

**Key Changes:**
*   Creates 'tier2-verification-documents' storage bucket:
    *   Private bucket (not public)
    *   5MB file size limit
    *   Allowed types: Images (JPEG, PNG, GIF, WebP), PDF, DOC, DOCX, TXT
*   Implements comprehensive RLS policies:
    *   Admins can read all documents
    *   Company owners can upload to their company's folder
    *   Admins can delete documents
    *   Service role has full access for automated processes

---

## `20250515500000_create_ensure_admin_function.sql`

**Purpose:** Creates helper function for admin authorization. Idempotent.

**Key Changes:**
*   Creates `internal.ensure_admin()` function:
    *   SECURITY DEFINER
    *   Calls `internal.is_admin()`
    *   Raises exception if user is not admin
    *   Simplifies admin checks in other functions

---

## `20250516000000_add_company_stats_function.sql`

**Purpose:** Adds function for admin dashboard statistics. Idempotent.

**Key Changes:**
*   Creates `public.get_company_verification_stats()` function:
    *   SECURITY DEFINER with admin check
    *   Returns counts by verification status
    *   Used for admin dashboard metrics

---

## `20250517000000_add_verification_status_notifications.sql`

**Purpose:** Enhances admin verification updates with notifications and cleanup. Idempotent.

**Key Changes:**
*   Redefines `public.admin_update_company_verification`:
    *   Sends automated message to company owner on status change
    *   Includes user-friendly status display names
    *   Handles Tier 2 document cleanup:
        *   Deletes document from storage
        *   Clears document metadata fields
    *   Includes comprehensive error handling and logging

---

## `20250518000000_create_request_tier2_verification_rpc.sql`

**Purpose:** Creates RPC for company owners to request Tier 2 verification. Idempotent.

**Key Changes:**
*   Creates `public.request_company_tier2_verification` function:
    *   Parameters: `p_company_id`, `p_tier2_document_type`, `p_tier2_document_filename`, `p_tier2_document_storage_path`
    *   SECURITY DEFINER with ownership and eligibility checks
    *   Validates document details
    *   Updates company status to 'TIER2_PENDING'
    *   Records document metadata and submission timestamp

---

## `20250518500000_add_tier2_process_fields_to_companies.sql`

**Purpose:** Adds fields for tracking Tier 2 verification process. Idempotent.

**Key Changes:**
*   Adds columns to `public.companies`:
    *   `tier2_submission_date TIMESTAMPTZ`
    *   `tier2_document_type TEXT`
    *   `tier2_document_filename TEXT`
    *   `tier2_document_storage_path TEXT`
    *   `tier2_document_uploaded_at TIMESTAMPTZ`
*   Adds detailed column comments for documentation

---

## `20250519000000_add_tier2_document_fields.sql`

**Purpose:** Updates views and types to include Tier 2 document fields. Idempotent.

**Key Changes:**
*   Updates `public.companies_view`:
    *   Includes all Tier 2 document fields
    *   Maintains existing field structure
*   Updates `public.admin_company_details` type
*   Updates dependent functions:
    *   `public.get_user_companies`
    *   `public.admin_get_all_companies_with_owner_info`

---

## `20250520000000_create_posts_table.sql`

**Purpose:** Implements social feed post functionality. Idempotent.

**Key Changes:**
*   Creates `public.content_status_enum` type
*   Creates `public.posts` table:
    *   Core fields: `id`, `user_id`, `company_id`, `content`
    *   Media support: `media_url`, `media_type`
    *   Subscription integration: `author_subscription_tier`
    *   Moderation: `status` (visible/removed)
*   Implements RLS policies:
    *   Public read for visible posts
    *   Author CRUD permissions
*   Creates `public.handle_updated_at()` function and trigger

---

## `20250520000001_create_post_likes_table.sql`

**Purpose:** Implements post like functionality. Idempotent.

**Key Changes:**
*   Creates `public.post_likes` table:
    *   Composite PK: `(post_id, user_id)`
    *   Tracks like timestamps
*   Implements RLS policies:
    *   Public read access
    *   User can like/unlike
*   Adds performance indexes

---

## `20250520000002_create_post_comments_table.sql`

**Purpose:** Implements threaded comments on posts. Idempotent.

**Key Changes:**
*   Creates `public.post_comments` table:
    *   Supports threaded replies via `parent_comment_id`
    *   Tracks creation and updates
*   Implements RLS policies:
    *   Public read access
    *   Author CRUD permissions
*   Adds performance indexes
*   Reuses `handle_updated_at` trigger

---

## `20250520000003_create_user_subscriptions_table.sql`

**Purpose:** Implements user subscription management. Idempotent.

**Key Changes:**
*   Creates `public.user_subscriptions` table:
    *   Tracks subscription tiers
    *   Integrates with Stripe
    *   Manages subscription periods
*   Implements RLS policies:
    *   Users can read own subscription
    *   Service role manages changes
*   Adds performance indexes
*   Reuses `handle_updated_at` trigger

---

## `20250520000004_create_user_connections_table.sql`

**Purpose:** Implements an early version of user-to-user connections. Idempotent. **(Superseded by `20250602000000_create_user_connections_table.sql`)**

**Key Changes:**
*   Creates `public.user_connections` table (schema may differ from the current version).
*   Tracks connection requests and status.
*   Prevents self-connections.
*   Ensures unique connections.
*   Implements comprehensive RLS policies.
*   Adds performance indexes.
*   Original version mentioned reusing `handle_updated_at` trigger (current version does not use `updated_at`).

---

## `20250520000005_create_user_company_follows_table.sql`

**Purpose:** Implements an early version of company following functionality. Idempotent. **(Superseded by `20250610000000_create_user_company_follows.sql`)**

**Key Changes:**
*   Creates `public.user_company_follows` table (schema may differ from the current version).
*   Composite PK: `(user_id, company_id)`.
*   Tracks follow timestamps.
*   Implements RLS policies.
*   Public read access.
*   Users can follow/unfollow.
*   Adds performance indexes.

---

## `20250520000006_create_company_to_company_connections_table.sql`

**Purpose:** Implements an early version of company-to-company relationships (follows, partnerships). Idempotent. **(Superseded by `20250602000005_create_company_connections_table.sql` and `20250602000006_create_company_connection_rpcs.sql`)**

**Key Changes:**
*   Creates `public.company_to_company_connections` table.
*   Tracks source and target companies.
*   Supports multiple connection types (FOLLOWING, PARTNERSHIP_REQUESTED, etc.).
*   Prevents self-connections and duplicates.
*   Implements RLS policies.
*   Adds performance indexes and constraints.

---

## `20250520800000_add_more_profile_fields_to_companies.sql`

**Purpose:** Enhances company profiles with additional business information. Idempotent.

**Key Changes:**
*   Adds new columns to `public.companies`:
    *   Visual: `banner_url`
    *   Business info: `year_founded`, `business_type`, `employee_count`, `revenue_range`
    *   Social: `social_media_links` (JSONB)
    *   Categorization: `certifications`, `tags`
    *   Location: `country` (defaults to 'Canada')
*   Ensures core fields exist: `industry`, `website`, `description`
*   Adds detailed column comments

---

## `20250520900000_add_updated_at_to_companies.sql`

**Purpose:** Adds timestamp tracking for company updates. Idempotent.

**Key Changes:**
*   Adds `updated_at TIMESTAMPTZ` to `public.companies`
*   Creates trigger function `public.handle_updated_at()`
*   Implements trigger on `public.companies`
*   Backfills existing rows with `created_at` values

---

## `20250521000000_update_companies_view.sql`

**Purpose:** Updates company view with new fields and derived columns. Idempotent.

**Key Changes:**
*   Updates `public.companies_view`:
    *   Includes all new profile fields
    *   Adds derived verification fields
    *   Renames fields for consistency
    *   Maintains backward compatibility
*   Updates `public.get_user_companies` function
*   Maintains proper permissions

---

## `20250522000000_create_get_feed_posts_rpc.sql`

**Purpose:** Implements social feed post retrieval with prioritization. Idempotent.

**Key Changes:**
*   Creates `public.get_feed_posts` function:
    *   Parameters: user ID, page number, page size
    *   Prioritizes network posts (connections, follows)
    *   Includes post details, author info, company info
    *   Tracks like/comment counts
    *   Supports pagination
*   Implements sophisticated sorting:
    *   Network relevance
    *   Subscription tier
    *   Recency

---

## `20250523103000_create_post_media_storage.sql`

**Purpose:** Configures secure storage for post media (images/videos). Idempotent.

**Key Changes:**
*   Creates `post_media` storage bucket:
    *   Public access for read operations (`public: true`).
    *   5MB file size limit.
    *   Allowed MIME types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`.
*   Implements storage RLS policies for `storage.objects` in the `post_media` bucket:
    *   Authenticated users can upload to their own designated paths (e.g., `public/{user_id}/{filename}`).
    *   Public read access for files under the `public/` path.
    *   Authenticated users can delete their own uploaded files.

---

## `20250524000000_create_content_flagging_tables.sql`

**Purpose:** Implements content moderation flagging system. Idempotent.

**Key Changes:**
*   Creates `flag_status_enum` type
*   Creates tables:
    *   `public.post_flags`
    *   `public.comment_flags`
*   Implements RLS policies:
    *   Users can flag content once
    *   Users can view their flags
    *   Users can update pending flags
    *   Admins have full access
*   Adds performance indexes

---

## `20250525000000_create_admin_flag_rpc_functions.sql`

**Purpose:** Implements admin functions for flag management. Idempotent.

**Key Changes:**
*   Creates admin RPC functions:
    *   `admin_get_flag_statistics`
    *   `admin_get_post_flags`
    *   `admin_update_post_flag_status`
    *   `admin_get_comment_flags`
    *   `admin_update_comment_flag_status`
*   Implements security checks
*   Provides pagination and filtering

---

## `20250526000000_add_moderation_features.sql`

**Purpose:** Implements comprehensive content moderation system. Idempotent.

**Key Changes:**
*   Creates new ENUM types:
    *   `profile_status_enum`
    *   `admin_action_type_enum`
    *   `admin_action_target_type_enum`
*   Adds moderation fields to tables
*   Creates `admin_actions_log` table
*   Updates RLS for banned users
*   Implements ban checks in policies

---

## `20250526000001_create_admin_action_rpcs.sql`

**Purpose:** Implements admin moderation action functions. Idempotent.

**Key Changes:**
*   Creates admin RPC functions:
    *   `admin_remove_post`
    *   `admin_remove_comment`
    *   `admin_warn_user`
    *   `admin_ban_user`
*   Implements automated notifications
*   Creates helper functions
*   Maintains audit trail

---

## `20250526000003_create_user_notifications_table.sql`

**Purpose:** Implements user notification system. Idempotent.

**Key Changes:**
*   Creates `notification_type_enum`
*   Creates `user_notifications` table:
    *   Supports various notification types
    *   Tracks read status
    *   Links to related content
*   Implements RLS policies
*   Adds performance indexes

---

## `20250526000004_create_notification_rpcs.sql`

**Purpose:** Implements notification management functions. Idempotent.

**Key Changes:**
*   Creates RPC functions:
    *   `get_user_notifications`
    *   `mark_notification_as_read`
    *   `mark_all_notifications_as_read`
*   Implements pagination
*   Tracks unread counts
*   Maintains security context

---

## `20250529000000_create_get_post_comments_threaded_rpc.sql`

**Purpose:** Implements threaded comment retrieval. Idempotent.

**Key Changes:**
*   Creates `get_post_comments_threaded` function:
    *   Uses recursive CTE for threading
    *   Maintains comment hierarchy
    *   Includes user information
    *   Preserves sort order
*   Optimizes for performance
*   Supports unlimited nesting

---

## `20250531000001_add_multiple_images_support.sql`

**Purpose:** Enhances the `posts` table and related functions to support multiple media items (images/videos) per post. Idempotent.

**Key Changes:**
*   **Posts Table (`public.posts`):**
    *   Renames existing `media_url` and `media_type` columns to `old_media_url` and `old_media_type` respectively.
    *   Adds new array columns: `media_urls TEXT[] DEFAULT '{}'` and `media_types TEXT[] DEFAULT '{}'`.
    *   Migrates data from old single media columns to the new array columns.
    *   Drops the `old_media_url` and `old_media_type` columns.
    *   Adds constraints:
        *   `max_media_items`: Limits the number of media items to 5 per post (checks array length of `media_urls` and `media_types`).
        *   `media_arrays_same_length`: Ensures `media_urls` and `media_types` arrays have the same length.
*   **`get_feed_posts` Function:**
    *   Drops existing versions of the function (if they exist) to avoid return type conflicts.
    *   Recreates `get_feed_posts(p_user_id UUID, p_limit INTEGER, p_offset INTEGER, p_category post_category)`.
    *   Updates the `RETURNS TABLE` definition to include `post_media_urls TEXT[]` and `post_media_types TEXT[]`.
    *   The function logic is updated to select `p.media_urls` and `p.media_types` from the `posts` table.
    *   Fixes an ambiguous `company_id` reference in a subquery by aliasing `user_company_follows` to `ucf` and using `ucf.company_id`.

---

## `20250531000002_add_analytics_events.sql`

**Purpose:** Introduces a table and related functions for collecting analytics events, primarily for Pro-tier users. Idempotent.

**Key Changes:**
*   **`analytics_events` Table (`public.analytics_events`):**
    *   Creates the table to store individual analytics events.
    *   Columns: `id UUID`, `user_id UUID` (references `auth.users`), `event_type TEXT`, `event_data JSONB`, `created_at TIMESTAMPTZ`.
    *   `event_type` has a `CHECK` constraint to ensure it's one of the predefined valid event types (e.g., `post_view`, `post_create`, `company_view`, etc.).
    *   Adds indexes on `user_id`, `event_type`, and `created_at` for performance.
*   **RLS Policies for `analytics_events`:**
    *   `Allow Pro users to insert events`: Allows authenticated users with an active 'PRO' subscription (checked via `user_subscriptions` table) to insert records.
    *   `Users can read their own events`: Allows authenticated users to select only their own events.
*   **`get_user_analytics` Function (`public.get_user_analytics`):**
    *   Creates a function `get_user_analytics(p_user_id UUID, p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ)`.
    *   `SECURITY DEFINER` function.
    *   Checks if the `p_user_id` has an active 'PRO' subscription. If not, returns no data.
    *   Returns a table with aggregated event counts (`event_type`, `event_count`, `first_occurrence`, `last_occurrence`) for the specified user and date range.

---

## `20250602000000_create_user_connections_table.sql`

**Purpose:** Establishes the current user-to-user connection system, replacing earlier versions. Aligns with `ConnectionSystem.md`. Idempotent.

**Key Changes:**
*   Creates `public.connection_status_enum` ('PENDING', 'ACCEPTED', 'DECLINED', 'BLOCKED').
*   Creates `public.user_connections` table:
    *   Fields: `id`, `requester_id` (FK to `profiles.id`), `addressee_id` (FK to `profiles.id`), `status` (using `connection_status_enum`), `notes` (TEXT), `requested_at`, `responded_at`.
    *   No `updated_at` column.
    *   Constraint `user_connections_check_different_users` (requester_id <> addressee_id).
    *   Unique constraint `user_connections_unique_pair` on `(requester_id, addressee_id)`.
*   Adds indexes on `requester_id`, `addressee_id`, and `status`.
*   Enables RLS and defines policies:
    *   "Users can view their own connection records".
    *   "Users can send connection requests".
    *   "Users can cancel their sent pending requests".
    *   "Addressees can respond to pending connection requests".
    *   "Users can remove an accepted connection".
*   Adds comments on table and columns.

---

## `20250602000001_create_user_connection_rpcs.sql`

**Purpose:** Creates RPC functions for managing the current user-to-user connection system. Aligns with `ConnectionSystem.md`. Idempotent.

**Key Changes:**
*   Creates helper function `internal.get_current_user_id()`.
*   Creates `public.send_user_connection_request(p_addressee_id UUID, p_message TEXT DEFAULT NULL)`: Sends a request; handles existing connections and unique violations by raising appropriate exceptions.
*   Creates `public.respond_user_connection_request(p_request_id UUID, p_response TEXT)`: Allows addressee to 'accept' or 'decline'.
*   Creates `public.remove_user_connection(p_other_user_id UUID)`: Deletes an 'ACCEPTED' connection.
*   Creates `public.get_user_connection_status_with(p_other_user_id UUID)`: Returns detailed status like 'PENDING_SENT', 'ACCEPTED', 'DECLINED_BY_THEM', etc.
*   Creates `public.get_pending_user_connection_requests()`: Returns incoming pending requests for the current user.
*   Creates `public.get_sent_user_connection_requests()`: Returns outgoing pending requests for the current user.
*   Creates `public.get_user_network(p_target_user_id UUID)`: Returns profile details of accepted connections for a user.
*   Adds comments on all created functions.

---

## `20250602000004_create_company_users_table.sql`

**Purpose:** Establishes the system for linking users to companies with specific roles, crucial for company-level permissions. Idempotent.

**Key Changes:**
*   Creates `public.company_role_enum` ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER').
*   Creates `public.company_users` table:
    *   Fields: `id`, `company_id` (FK to `companies.id`), `user_id` (FK to `profiles.id`), `role` (using `company_role_enum`), `created_at`, `updated_at`.
    *   Unique constraint `company_users_unique_user_company` on `(user_id, company_id)`.
*   Creates trigger function `internal.set_updated_at_on_company_users()` and associated trigger.
*   Adds indexes on `company_id`, `user_id`, and `role`.
*   Enables RLS and defines policies for viewing memberships, adding users, updating/removing users, and self-removal (owners cannot self-remove).
*   Creates trigger function `internal.validate_company_user_role_update()` to prevent invalid role changes (e.g., demoting last owner).
*   Creates trigger function `internal.assign_company_owner_role()` (on `companies` table AFTER INSERT) to automatically grant 'OWNER' role in `company_users` to the company creator.
*   Adds comments on table and columns.

---

## `20250602000005_create_company_connections_table.sql`

**Purpose:** Establishes the current company-to-company connection system, replacing earlier versions. Aligns with `ConnectionSystem.md`. Idempotent.

**Key Changes:**
*   Uses the existing `public.connection_status_enum`.
*   Creates `public.company_connections` table:
    *   Fields: `id`, `requester_company_id` (FK to `companies.id`), `addressee_company_id` (FK to `companies.id`), `status`, `requested_by_user_id` (FK to `profiles.id`), `requested_at`, `responded_at`.
    *   Constraint `company_connections_check_different_companies`.
    *   Unique constraint `company_connections_unique_pair` on `(requester_company_id, addressee_company_id)`.
*   Adds indexes on `requester_company_id`, `addressee_company_id`, `status`, `requested_by_user_id`.
*   Enables RLS and defines policies for viewing and managing company connections, requiring specific company roles ('ADMIN', 'OWNER') via `company_users` table. Policies cover:
    *   Public viewing of 'ACCEPTED' connections.
    *   Admins viewing their company's records.
    *   Admins sending requests.
    *   Admins canceling sent pending requests.
    *   Admins responding to pending requests.
    *   Admins removing an accepted connection.
*   Adds comments on table and columns.

---

## `20250602000006_create_company_connection_rpcs.sql`

**Purpose:** Creates RPC functions for managing the current company-to-company connection system. Aligns with `ConnectionSystem.md`. Idempotent.

**Key Changes:**
*   Creates helper function `internal.is_company_admin(p_user_id UUID, p_company_id UUID)` using `company_users` table.
*   Creates `public.send_company_connection_request(p_acting_company_id UUID, p_target_company_id UUID)`: Requires acting user to be admin of acting company; checks company verification status.
*   Creates `public.respond_company_connection_request(p_request_id UUID, p_response TEXT)`: Requires acting user to be admin of addressee company.
*   Creates `public.remove_company_connection(p_acting_company_id UUID, p_other_company_id UUID)`: Requires acting user to be admin of acting company.
*   Creates `public.get_company_connection_status_with(p_acting_company_id UUID, p_other_company_id UUID)`: Provides detailed status for admins of acting company.
*   Creates `public.get_pending_company_connection_requests(p_for_company_id UUID)`: For admins of the company.
*   Creates `public.get_sent_company_connection_requests(p_from_company_id UUID)`: For admins of the company.
*   Creates `public.get_company_network_count(p_company_id UUID)`: Publicly visible count.
*   Creates `public.get_company_network_details(p_target_company_id UUID)`: Detailed company info for admins of the target company.
*   Adds comments on all created functions.

---

## `20250603000000_create_get_company_connections_rpc.sql`

**Purpose:** Creates a function to retrieve companies connected to a given company. **Note: This RPC appears to use a schema (`company1_id`, `company2_id`, `status = 'CONNECTED'`, `companies_view`) that may differ from the primary `company_connections` table structure established in `20250602000005...`. Its current utility alongside newer RPCs like `get_company_network_details` should be reviewed.** Idempotent.

**Key Changes:**
*   Creates `get_company_connections(p_company_id UUID)` function.
*   Returns `TABLE (connected_company_id UUID, name TEXT, avatar_url TEXT, industry TEXT, connected_at TIMESTAMPTZ)`.
*   Joins `company_connections` with `companies_view`.
*   Filters for `status = 'CONNECTED'` and where `p_company_id` is `company1_id` or `company2_id`.

---

## `20250610000000_create_user_company_follows.sql`

**Purpose:** Implements the current user-company follow functionality, replacing earlier versions. Idempotent.

**Key Changes:**
*   Creates `public.user_company_follows` table:
    *   Fields: `id`, `user_id` (FK to `public.users(id)`), `company_id` (FK to `public.companies(id)`), `created_at`.
    *   Unique constraint on `(user_id, company_id)`.
*   Enables RLS and defines policies:
    *   "Users can view their follows".
    *   "Users can follow companies" (insert).
    *   "Users can unfollow companies" (delete).
*   Creates RPC functions (SECURITY DEFINER):
    *   `public.follow_company(p_company_id UUID)`: Inserts follow, handles conflicts.
    *   `public.unfollow_company(p_company_id UUID)`: Deletes follow.
    *   `public.get_company_follow_status(p_company_id UUID)`: Returns boolean.
    *   `public.get_followed_companies()`: Returns `SETOF public.user_company_follows` for the current user.

---