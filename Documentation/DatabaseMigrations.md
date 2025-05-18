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

**Purpose:** Implements user-to-user connections. Idempotent.

**Key Changes:**
*   Creates `public.user_connections` table:
    *   Tracks connection requests and status
    *   Prevents self-connections
    *   Ensures unique connections
*   Implements comprehensive RLS policies:
    *   Connection participants can read
    *   Requesters can create/cancel
    *   Addressees can accept/decline
    *   Both parties can block/delete
*   Adds performance indexes
*   Reuses `handle_updated_at` trigger

---

## `20250520000005_create_user_company_follows_table.sql`

**Purpose:** Implements company following functionality. Idempotent.

**Key Changes:**
*   Creates `public.user_company_follows` table:
    *   Composite PK: `(user_id, company_id)`
    *   Tracks follow timestamps
*   Implements RLS policies:
    *   Public read access
    *   Users can follow/unfollow
*   Adds performance indexes

---

## `20250520000006_create_company_to_company_connections_table.sql`

**Purpose:** Implements company-to-company relationships (follows, partnerships). Idempotent.

**Key Changes:**
*   Creates `public.company_to_company_connections` table:
    *   Tracks source and target companies
    *   Supports multiple connection types (FOLLOWING, PARTNERSHIP_REQUESTED, etc.)
    *   Prevents self-connections and duplicates
*   Implements RLS policies:
    *   Public read access
    *   Source company owner can initiate connections
    *   Target company owner can respond to partnerships
    *   Either owner can manage terminal states
*   Adds performance indexes and constraints

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

**Purpose:** Configures secure storage for post media files. Idempotent.

**Key Changes:**
*   Creates 'post_media' storage bucket:
    *   5MB file size limit
    *   Supports images (JPEG, PNG, GIF, WebP)
    *   Public bucket with RLS controls
*   Implements RLS policies:
    *   Public read for 'public/' path
    *   User-specific upload paths
    *   Owner-only deletion rights

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