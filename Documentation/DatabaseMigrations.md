# Supabase Database Migrations Overview

This document provides a summary of the database migrations applied to the project. Migrations are ordered chronologically by their timestamp in the filename.

---

## `20240507000000_initial_schema.sql`

**Purpose:** Establishes the foundational database schema. Idempotent.

**Key Changes:**
*   Enables `pg_trgm`.
*   Creates `public.companies`, `public.rfqs`.
*   Creates an initial `public.posts` table (defined with `id`, `created_at`, `content`, `company_id`, `type`, `title`, `rfq_id`; RLS allows public read and company owner CRUD). This table is later replaced by `20250520000000_create_posts_table.sql`.
*   Adds indexes and RLS policies for these tables.
*   Creates helper functions: `public.get_user_companies(user_id UUID)` (SECURITY DEFINER) and `public.internal_upsert_profile_for_user(...)` (SECURITY DEFINER).

---

## `20240507000001_add_indexes.sql`

**Purpose:** Improves search performance on `public.companies`. Idempotent.

**Key Changes:**
*   Adds GIN index `public.companies_name_idx` on `companies.name` using `gin_trgm_ops`.

---

## `20240507000003_enhance_rfqs.sql`

**Purpose:** Significantly expands RFQ functionality. Idempotent.

**Key Changes:**
*   Adds columns to `public.rfqs` (e.g., `category`, `requirements` JSONB, `updated_at`).
*   Creates `public.rfq_templates`, `public.rfq_invitations`, `public.quotes`, `public.quote_revisions`.
*   Adds indexes and RLS policies for new/existing tables.
*   Creates functions: `public.get_rfq_statistics`, `public.update_rfq_timestamp`, `public.create_quote_revision`.
*   Creates triggers for `updated_at` and quote revisions.

---

## `20240508000001_create_profiles.sql`

**Purpose:** Establishes `public.profiles` for user-specific public info. Idempotent.

**Key Changes:**
*   Creates `public.profiles` table (references `auth.users.id`).
*   Adds indexes (including GIN trigram on `name`).
*   Defines RLS policies (public read, owner can manage).

---

## `20240508000002_add_company_avatar.sql`

**Purpose:** Adds `avatar_url` to `public.companies` for logos. Idempotent.

**Key Changes:**
*   Adds `avatar_url TEXT` column.

---

## `20240509000000_create_simple_messaging.sql`

**Purpose:** Implements basic direct messaging. Idempotent.

**Key Changes:**
*   Creates `public.messages` table with `id`, `created_at`, `sender_id` (FK to `auth.users`), `receiver_id` (FK to `auth.users`), `content`, `read`. Adds indexes.
*   RLS Policies for `public.messages`:
    *   Users can SELECT messages where they are sender or receiver.
    *   Users can INSERT messages if `auth.uid()` is the `sender_id`.
    *   The 'postgres' role (e.g., in triggers) can INSERT messages if the `sender_id` is the profile ID of 'rmarshall@itmarshall.net'.
    *   Users can UPDATE messages they received to mark them as read.
*   Creates `public.message_view` (joins `messages` with `profiles`).
*   Creates `public.get_conversations(p_current_user_id uuid)` function.

---

## `20240509000001_add_welcome_message_trigger.sql`

**Purpose:** Automates sending welcome messages to new users. Idempotent.

**Key Changes:**
*   Creates `public.send_welcome_message_to_new_user()` trigger function (`SECURITY DEFINER`, sends message from system user).
*   Creates trigger `trigger_send_welcome_message` on `public.profiles`.

---

## `20240510000000_configure_realtime_for_messages.sql`

**Purpose:** Configures `public.messages` for Supabase Realtime. Idempotent.

**Key Changes:**
*   Sets `REPLICA IDENTITY FULL` for `public.messages`.
*   Adds `public.messages` to `supabase_realtime` publication.

---

## `20240510000001_add_company_verification.sql`

**Purpose:** Adds fields to `public.companies` for admin-driven verification. Idempotent.

**Key Changes:**
*   Adds `verification_status VARCHAR(20)` (default 'unverified') and `admin_notes TEXT`.
*   Adds `check_verification_status` constraint (`'unverified', 'pending', 'verified', 'rejected'`).

---

## `20240510000002_secure_companies_access.sql`

**Purpose:** Refines `public.companies` access control, introduces `internal.is_admin()`. For details on administrator identification, see `Documentation/AdministratorSystem.md`.

**Key Changes:**
*   Creates `internal` schema and `internal.is_admin(p_user_id uuid)` function.
*   Creates basic `public.companies_view` (hides `admin_notes`).
*   Updates `public.get_user_companies` to use this view.
*   Revises RLS: owners manage own, admins have full access (via `internal.is_admin()`).
*   Trigger `internal.prevent_owner_update_restricted_company_fields` to protect `verification_status`, `admin_notes` from owner updates.

---

## `20240510000003_admin_company_tools.sql`

**Purpose:** Adds admin functions for company management. Idempotent.
Admin access is controlled by `internal.is_admin()`. See `Documentation/AdministratorSystem.md`.

**Key Changes:**
*   Creates `public.admin_company_details` type (basic at this stage).
*   Creates `public.admin_get_all_companies_with_owner_info()` (uses `internal.is_admin()`).
*   Creates `public.admin_update_company_verification(...)` (uses `internal.is_admin()`).

---

## `20240510000004_enhance_company_profile.sql`

**Purpose:** Enhances `public.companies` with address, contact, services. Updates view/admin tools. Idempotent.

**Key Changes:**
*   Adds `street_address`, `city`, `province`, `postal_code`, `major_metropolitan_area`, `contact_person_name`, `contact_person_email`, `contact_person_phone`, `services` TEXT[] to `public.companies`.
*   Updates `public.companies_view` (includes these new fields and original `location`).
*   Updates `public.admin_company_details` type and `admin_get_all_companies_with_owner_info` function (includes new fields and original `company_location`).

---

## `20240510000005_setup_logo_storage.sql`

**Purpose:** Sets up Supabase Storage for company logos. Idempotent.

**Key Changes:**
*   Creates 'company-logos' storage bucket.
*   RLS: Public read; owners manage their company's logos.

---

## `20240514120000_add_other_metro_specify.sql`

**Purpose:** Adds `other_metropolitan_area_specify` to `public.companies`. Removes old `location` field from view/admin type. Idempotent.

**Key Changes:**
*   Adds `other_metropolitan_area_specify TEXT` to `public.companies`.
*   Updates `public.companies_view`: adds `other_metropolitan_area_specify`, removes `location`.
*   Updates `public.admin_company_details` type and `admin_get_all_companies_with_owner_info` function: adds `other_metropolitan_area_specify`, removes `company_location`.

---

## `20240515000000_add_tiered_verification.sql`

**Purpose:** Implements tiered company verification. Updates `public.companies`, view, and admin tools. Idempotent.

**Key Changes:**
*   Adds `self_attestation_completed`, `business_number`, `public_presence_links` to `public.companies`.
*   Standardizes existing `verification_status` to 'UNVERIFIED'.
*   Updates `check_verification_status` constraint with new statuses ('UNVERIFIED', 'TIER1_PENDING', 'TIER1_VERIFIED', 'TIER1_REJECTED', 'TIER2_PENDING', 'TIER2_FULLY_VERIFIED', 'TIER2_REJECTED').
*   Updates `public.companies_view`: Includes new Tier 1 fields. The view at this stage reflects additions from `20240510000004_enhance_company_profile.sql` and `20240514120000_add_other_metro_specify.sql` (i.e., detailed address, `other_metropolitan_area_specify`, no `location`).
*   Updates `public.admin_company_details` type and `public.admin_get_all_companies_with_owner_info`: Includes new Tier 1 fields and reflects changes from prior profile enhancements (no `company_location`).

---

## `20250511000022_create_request_tier1_verification_rpc.sql`

**Purpose:** Creates RPC `public.request_company_tier1_verification` for Tier 1 submission. Idempotent.

**Key Changes:**
*   `public.request_company_tier1_verification(p_company_id UUID, p_business_number TEXT, p_public_presence_links TEXT[], p_self_attestation_completed BOOLEAN)`:
    *   `SECURITY DEFINER`. Checks ownership, eligibility. Updates company to 'TIER1_PENDING'.

---

## `20250511163540_fix_tier2_storage_policy_take2.sql`

**Purpose:** Configures `tier2-verification-documents` storage bucket and RLS. Idempotent.
Admin RLS relies on `internal.is_admin()`. See `Documentation/AdministratorSystem.md`.

**Key Changes:**
*   Creates 'tier2-verification-documents' bucket (private).
*   RLS policies: Admins (via internal.is_admin()) can read and delete all files. Company owners can upload documents to a path prefixed with their company's ID (e.g., {company_id}/{filename}). service_role has full access (including delete).

---

## `20250515500000_create_ensure_admin_function.sql`

**Purpose:** Creates `internal.ensure_admin()` helper to enforce admin-only access. Idempotent.
See `Documentation/AdministratorSystem.md` for details on admin identification.

**Key Changes:**
*   `internal.ensure_admin()`: Calls `internal.is_admin()`, raises exception if not admin.

---

## `20250516000000_add_company_stats_function.sql`

**Purpose:** Adds `public.get_company_verification_stats()` for admin. Idempotent.
Admin access controlled by `internal.ensure_admin()`. See `Documentation/AdministratorSystem.md`.

**Key Changes:**
*   `public.get_company_verification_stats()`: `SECURITY DEFINER`. Calls `internal.ensure_admin()`. Returns counts by verification status.

---

## `20250517000000_add_verification_status_notifications.sql`

**Purpose:** Updates `public.admin_update_company_verification` to send messages and delete Tier 2 docs. Idempotent.
Admin access controlled by `internal.is_admin()`. See `Documentation/AdministratorSystem.md`.

**Key Changes:**
*   `public.admin_update_company_verification(...)` redefined:
    *   Sends message from system user on status change.
    *   Deletes Tier 2 doc from storage and clears company fields if status is 'TIER2_FULLY_VERIFIED' or 'TIER2_REJECTED'.

---

## `20250518000000_create_request_tier2_verification_rpc.sql`

**Purpose:** Creates `public.request_company_tier2_verification` RPC for Tier 2 submission. Idempotent.

**Key Changes:**
*   `public.request_company_tier2_verification(p_company_id UUID, p_tier2_document_type TEXT, p_tier2_document_filename TEXT, p_tier2_document_storage_path TEXT)`:
    *   `SECURITY DEFINER`. Checks ownership, 'TIER1_VERIFIED' status. Updates company to 'TIER2_PENDING', stores doc details.

---

## `20250518500000_add_tier2_process_fields_to_companies.sql`

**Purpose:** Adds fields to `public.companies` for managing the Tier 2 verification document submission process. Idempotent.

**Key Changes:**
*   Adds `tier2_submission_date`, `tier2_document_type`, `tier2_document_filename`, `tier2_document_storage_path`, `tier2_document_uploaded_at` to `public.companies` (using `ADD COLUMN IF NOT EXISTS`). Includes comments for each column.

---

## `20250519000000_add_tier2_document_fields.sql`

**Purpose:** Adds Tier 2 document-related fields to `public.companies` and updates dependent views/types. Idempotent.

**Key Changes:**
*   Attempts to add `tier2_document_type`, `tier2_document_filename`, `tier2_document_storage_path`, `tier2_document_uploaded_at` to `public.companies` (these are likely already present from `20250518500000_add_tier2_process_fields_to_companies.sql`).
*   Crucially, updates `public.companies_view` and `public.admin_company_details` type to include these Tier 2 document fields by dropping/recreating them and their dependents (`get_user_companies`, `admin_get_all_companies_with_owner_info`).

---

## `20250520000000_create_posts_table.sql`

**Purpose:** Creates the main `public.posts` table for the social feed, replacing any prior version. Defines `public.content_status_enum` and `public.handle_updated_at()` trigger function. Idempotent.

**Key Changes:**
*   `DROP TABLE IF EXISTS public.posts CASCADE;`
*   Creates `public.content_status_enum` ('visible', 'removed_by_admin').
*   Creates `public.posts` with:
    *   `id` (UUID, PK)
    *   `user_id` (UUID, FK to `public.profiles(id)` ON DELETE CASCADE)
    *   `company_id` (UUID, FK to `public.companies(id)` ON DELETE CASCADE, optional)
    *   `rfq_id` (UUID, FK to `public.rfqs(id)` ON DELETE SET NULL, optional)
    *   `content` (TEXT, NOT NULL)
    *   `media_url` (TEXT, optional)
    *   `media_type` (TEXT, optional, e.g., 'image/jpeg')
    *   `author_subscription_tier` (TEXT, optional)
    *   `