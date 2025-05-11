# Supabase Database Migrations Overview

This document provides a summary of the database migrations applied to the project. Migrations are ordered chronologically by their timestamp in the filename.

---

## `20240507000000_initial_schema.sql`

**Purpose:** Establishes the foundational database schema.

**Key Changes:**
*   Enables the `pg_trgm` extension for trigram-based text searching.
*   Creates core tables:
    *   `public.companies`: Stores company profile information, including `owner_id` referencing `auth.users`.
    *   `public.rfqs`: Stores Request for Quotes, linked to `companies`.
    *   `public.posts`: Stores general posts and RFQ-related posts, linked to `companies` and `rfqs`.
*   Adds indexes on foreign key columns for performance.
*   Enables Row Level Security (RLS) for `companies`, `rfqs`, and `posts`.
*   Defines initial RLS policies:
    *   Public read access for all three tables.
    *   Users can insert, update, and delete their own records in `companies`.
    *   Company owners can insert, update, and delete `rfqs` and `posts` associated with their companies.
*   Creates helper functions:
    *   `public.get_user_companies(user_id UUID)`: Retrieves companies owned by a specific user.
    *   `public.internal_upsert_profile_for_user(...)`: Function to create/update a user's profile in `public.profiles` (intended to be called by a setup script).

---

## `20240507000001_add_indexes.sql`

**Purpose:** Improves search performance on the `companies` table.

**Key Changes:**
*   Adds a GIN (Generalized Inverted Index) on the `companies.name` column using `gin_trgm_ops`. This is useful for efficient trigram-based text similarity searches (e.g., fuzzy name matching).

---

## `20240507000003_enhance_rfqs.sql`

**Purpose:** Significantly expands the RFQ functionality and related data structures.

**Key Changes:**
*   Adds new columns to `public.rfqs`: `category`, `required_certifications` (array), `attachments` (array), `preferred_delivery_date`, `visibility`, `tags` (array), `requirements` (JSONB), `updated_at`.
*   Creates new tables:
    *   `public.rfq_templates`: Allows users to save RFQ templates.
    *   `public.rfq_invitations`: Tracks invitations sent to companies for specific RFQs.
    *   `public.quotes`: Stores quotes submitted by companies in response to RFQs.
    *   `public.quote_revisions`: Tracks revisions made to quotes.
*   Adds various indexes on the new tables and existing `rfqs` table for performance.
*   Enables RLS for the new tables (`rfq_templates`, `rfq_invitations`, `quotes`, `quote_revisions`).
*   Defines RLS policies for these new tables, typically allowing owners/involved parties to view/manage their respective records.
*   Creates functions:
    *   `public.get_rfq_statistics(rfq_id UUID)`: Calculates statistics for an RFQ (total quotes, average amount, etc.).
*   Creates triggers:
    *   `update_rfq_timestamp`: Automatically updates `rfqs.updated_at` on row updates.
    *   `update_quote_timestamp`: Automatically updates `quotes.updated_at` on row updates (reuses `update_rfq_timestamp` function).
    *   `create_quote_revision_on_update`: Automatically creates a record in `quote_revisions` when a quote is updated.

---

## `20240508000001_create_profiles.sql`

**Purpose:** Establishes a public `profiles` table to store user-specific public information.

**Key Changes:**
*   Creates `public.profiles` table with columns like `id` (references `auth.users.id`), `name`, `email`, `avatar_url`.
*   Adds indexes on `email` and `name` (GIN trigram index).
*   Enables RLS for `profiles`.
*   Defines RLS policies:
    *   Profiles are viewable by everyone.
    *   Users can update and delete their own profile.
    *   Users can only insert their own profile.

---

## `20240508000002_add_company_avatar.sql`

**Purpose:** Adds a field to store company avatar/logo URLs.

**Key Changes:**
*   Adds an `avatar_url TEXT` column to the `public.companies` table. This column will store the URL of the company's logo, typically hosted in Supabase Storage.

---

## `20240509000000_create_simple_messaging.sql`

**Purpose:** Implements a basic direct messaging system between users.

**Key Changes:**
*   Creates `public.messages` table with `sender_id`, `receiver_id`, `content`, and `read` status.
*   Enables RLS for `messages`.
*   Adds indexes for performance on `sender_id`, `receiver_id`, and `created_at`.
*   Defines RLS policies for `messages`:
    *   Users can view messages they sent or received.
    *   Users can send messages as themselves. Includes a condition to allow a designated system user (identified by email via `profiles` table) to send messages if the operation is performed by the `postgres` session user (e.g., from a `SECURITY DEFINER` trigger).
    *   Users can mark messages they received as read.
*   Creates `public.message_view`: A view that joins `messages` with `profiles` to include sender/receiver names and avatars.
*   Creates `public.get_conversations(p_current_user_id uuid)`: A function to retrieve a list of a user's conversations, showing the other user, last message, and unread count.

---

## `20240509000001_add_welcome_message_trigger.sql`

**Purpose:** Automates sending a welcome message to new users.

**Key Changes:**
*   Creates `public.send_welcome_message_to_new_user()`: A PL/pgSQL trigger function.
    *   This function is `SECURITY DEFINER`.
    *   It looks up a designated system user ID from `public.profiles` using a hardcoded email ('rmarshall@itmarshall.net').
    *   It inserts a welcome message into `public.messages` from the system user to the newly created user (identified by `NEW.id` from the trigger context).
    *   Includes logging (RAISE NOTICE/WARNING) for diagnostics.
*   Creates a trigger `trigger_send_welcome_message`:
    *   Fires `AFTER INSERT` on the `public.profiles` table.
    *   Executes `public.send_welcome_message_to_new_user()` for each new profile.

---

## `20240510000000_configure_realtime_for_messages.sql`

**Purpose:** Configures the `public.messages` table for Supabase Realtime.

**Key Changes:**
*   Sets `REPLICA IDENTITY FULL` for `public.messages`. This is required for Realtime to capture detailed changes (old and new values) for `UPDATE` and `DELETE` events.
*   Attempts to add `public.messages` to the `supabase_realtime` PostgreSQL publication. This allows changes to the table to be broadcast over websockets.
*   Includes fallback logic to try adding to a schema-named publication (e.g., `public`) if `supabase_realtime` doesn't exist, though this is less common in newer Supabase projects.
*   Grants `SELECT` on `pg_publication` and `pg_publication_tables` to the `postgres` role, which can be necessary for Realtime status checks.

---

## `20240510000001_add_company_verification.sql`

**Purpose:** Adds fields to support an admin-driven company verification process.

**Key Changes:**
*   Adds columns to `public.companies`:
    *   `verification_status VARCHAR(20)`: Stores the verification state (e.g., 'unverified', 'pending', 'verified', 'rejected'). Defaults to 'unverified'.
    *   `admin_notes TEXT`: For administrators to leave notes regarding the verification.
*   Adds a `CHECK` constraint `check_verification_status` to ensure `verification_status` only contains allowed values.

---

## `20240510000002_secure_companies_access.sql`

**Purpose:** Refines access control for company data, introduces an admin role concept, and protects sensitive fields.

**Key Changes:**
*   Creates `internal` schema: A schema for helper functions and triggers not meant for direct public access.
*   Grants `USAGE ON SCHEMA internal TO authenticated, service_role;` (This was a fix for a "permission denied for schema internal" error).
*   Creates `internal.is_admin(p_user_id uuid)`: A `SECURITY DEFINER` function that checks if a user is an administrator by comparing their email (from `public.profiles`) against a hardcoded admin email ('rmarshall@itmarshall.net'). Granted execute to `authenticated` and `service_role`.
*   Creates `public.companies_view`: A view that exposes most company data but hides `admin_notes` for general queries.
*   Updates `public.get_user_companies(p_user_id UUID)`: Modifies the function to return `SETOF public.companies_view`.
*   Revises RLS policies for `public.companies`:
    *   Drops old policies.
    *   Forces RLS.
    *   "Authenticated users can view company data via view": Allows authenticated users to select from `public.companies` (intended to be filtered through `companies_view` on the client-side or via specific functions).
    *   "Owners can insert their companies": Standard owner insert policy.
    *   "Owners can update their companies": Standard owner update policy (both `USING` and `WITH CHECK` on `auth.uid() = owner_id`).
    *   "Owners can delete their companies": Standard owner delete policy.
    *   "Admins can select all company data": Allows users identified by `internal.is_admin()` to select all columns directly from `public.companies`.
    *   "Admins can update any company": Allows admins to update any company record.
*   Creates `internal.prevent_owner_update_restricted_company_fields()`: A trigger function.
    *   Prevents non-admin company owners from modifying `verification_status` or `admin_notes`.
*   Creates trigger `before_company_update_check_restricted_fields`:
    *   Fires `BEFORE UPDATE` on `public.companies`.
    *   Executes `internal.prevent_owner_update_restricted_company_fields()`.

---

## `20240510000003_admin_company_tools.sql`

**Purpose:** Adds server-side functions for administrators to manage companies.

**Key Changes:**
*   Creates `admin_company_details` (custom SQL type): Defines the structure for returning detailed company information, including owner details.
*   Creates `admin_get_all_companies_with_owner_info()`:
    *   A `SECURITY DEFINER` function.
    *   Requires caller to be an admin (via `internal.is_admin()`).
    *   Returns a set of `admin_company_details` for all companies, joined with owner information from `public.profiles`.
*   Creates `admin_update_company_verification(p_company_id UUID, p_new_status VARCHAR(20), p_new_admin_notes TEXT)`:
    *   A `SECURITY DEFINER` function.
    *   Requires caller to be an admin.
    *   Updates the `verification_status` and `admin_notes` for a specified company.
    *   Returns the updated company row.
*   Grants `EXECUTE` on these functions to `authenticated` and `service_role` (access is controlled within the functions by `internal.is_admin()`).

---

## `20240510000004_enhance_company_profile.sql`

**Purpose:** Adds more detailed fields to the company profile for the onboarding form.

**Key Changes:**
*   Adds new columns to `public.companies`:
    *   `street_address TEXT`
    *   `city TEXT`
    *   `province VARCHAR(2)`
    *   `postal_code VARCHAR(7)`
    *   `major_metropolitan_area TEXT`
    *   `contact_person_name TEXT`
    *   `contact_person_email TEXT`
    *   `contact_person_phone TEXT`
    *   `services TEXT[]` (array of text for multiple services)
*   Adds `check_canadian_province` constraint to `public.companies` to validate the `province` field against a list of Canadian province/territory codes.
*   Updates `public.companies_view` to include these new fields.
*   Updates the `admin_company_details` type and `admin_get_all_companies_with_owner_info()` function to include these new fields for admin review.

---

## `20240510000005_setup_logo_storage.sql`

**Purpose:** Sets up Supabase Storage for company logos and configures RLS policies.

**Key Changes:**
*   Inserts a new bucket into `storage.buckets` named `company-logos`.
    *   The bucket is public (`public = TRUE`).
    *   File size limit is 5MB.
    *   Allowed MIME types are common image formats (JPEG, PNG, GIF, WebP).
    *   Uses `ON CONFLICT (id) DO UPDATE` for idempotency.
*   Defines RLS policies on `storage.objects` for the `company-logos` bucket:
    *   Drops existing policies for idempotency.
    *   "Public read access for company logos": Allows anyone to read files from the bucket.
    *   "Company owners can upload logos": Allows authenticated users to insert objects (upload files) if the `auth.uid()` matches the `owner_id` of the company whose UUID is the first part of the file path (`(string_to_array(storage.objects.name, '/'))[1]::uuid`).
    *   "Company owners can update logos": Similar logic for updating existing logo files.
    *   "Company owners can delete logos": Similar logic for deleting logo files.
    *   Crucially, these policies use `storage.objects.name` (or its implicit reference `name` or `objects.name` depending on SQL interpretation context) when parsing the file path, which was a fix for an earlier bug where `companies.name` was being incorrectly used. 

---

## `20240514120000_add_other_metro_specify.sql`

**Purpose:** Adds a specific field for users to enter their metropolitan area if they select "Other" for the `major_metropolitan_area`, removes the old general `location` field, and updates related database objects.

**Key Changes:**
*   Adds `other_metropolitan_area_specify TEXT` column to the `public.companies` table.
*   The general `location TEXT` column is effectively removed from `public.companies` (it's no longer included in the `companies_view` or admin-related types and functions).
*   Updates `public.companies_view`:
    *   Includes the new `other_metropolitan_area_specify` field.
    *   Excludes the old `location` field.
*   Updates `public.get_user_companies(p_user_id UUID)`:
    *   The function is recreated to return `SETOF public.companies_view`, ensuring it reflects the changes in the view (inclusion of `other_metropolitan_area_specify` and exclusion of `location`).
*   Updates `admin_company_details` (custom SQL type):
    *   The type is recreated to include `other_metropolitan_area_specify TEXT`.
    *   Excludes the old `company_location TEXT` field.
*   Updates `admin_get_all_companies_with_owner_info()`:
    *   The function is recreated to return `SETOF admin_company_details` (the updated type).
    *   The internal `SELECT` statement is updated to fetch `c.other_metropolitan_area_specify` and no longer fetches `c.location`. 

---

## `20240515000000_add_tiered_verification.sql`

**Purpose:** Implements a tiered company verification system, enhancing the existing verification process.

**Key Changes:**
*   Adds new columns to `public.companies`:
    *   `self_attestation_completed BOOLEAN NOT NULL DEFAULT FALSE`: Tracks if the user has completed a self-attestation step.
    *   `business_number TEXT NULL`: Stores the company's official business registration number.
    *   `public_presence_links TEXT[] NULL`: Stores an array of URLs to public profiles or mentions (e.g., social media, business directories).
*   Standardizes existing `verification_status` values in `public.companies` to 'UNVERIFIED' to establish a baseline for the new tier system.
*   Updates the `check_verification_status` constraint on `public.companies.verification_status` to include new tiered statuses:
    *   'UNVERIFIED' (Tier 0)
    *   'TIER1_PENDING' (User submitted for Tier 1)
    *   'TIER1_VERIFIED' (Tier 1 - Standard Verification)
    *   'TIER1_REJECTED'
    *   'TIER2_PENDING' (User submitted for Tier 2)
    *   'TIER2_FULLY_VERIFIED' (Tier 2 - Fully Verified)
    *   'TIER2_REJECTED'
*   Ensures the `DEFAULT` value for `public.companies.verification_status` is 'UNVERIFIED'.
*   Updates `public.companies_view` to include the new columns (`self_attestation_completed`, `business_number`, `public_presence_links`).
*   Recreates `public.get_user_companies(p_user_id UUID)` function to return `SETOF public.companies_view`, ensuring it reflects the view changes.
*   Updates the `admin_company_details` custom SQL type and the `admin_get_all_companies_with_owner_info()` function to include the new columns and reflect the new tiered `verification_status` values.

---

## `20250511000022_create_request_tier1_verification_rpc.sql`

**Purpose:** Creates a PostgreSQL RPC function that allows company owners to submit their company details for Tier 1 verification.

**Key Changes:**
*   Creates the function `public.request_company_tier1_verification(p_company_id UUID, p_business_number TEXT, p_public_presence_links TEXT[], p_self_attestation_completed BOOLEAN)`:
    *   This is a `LANGUAGE plpgsql` function with `SECURITY DEFINER` privileges.
    *   It takes the company ID, business number, public presence links, and self-attestation status as input.
    *   **Validation:**
        *   Checks if the company exists.
        *   Verifies that the `auth.uid()` of the caller matches the `owner_id` of the company.
        *   Ensures the company is eligible for a new Tier 1 application (i.e., its current `verification_status` is 'UNVERIFIED' or 'TIER1_REJECTED').
    *   **Action:**
        *   Updates the `public.companies` table for the specified `p_company_id`.
        *   Sets `business_number`, `public_presence_links`, and `self_attestation_completed` with the provided values.
        *   Changes the `verification_status` to 'TIER1_PENDING'.
*   Grants `EXECUTE` permission on this new function to the `authenticated` role, allowing logged-in users to call it.

---

## `20250516000000_add_company_stats_function.sql`

**Purpose:** Adds a function to retrieve statistics about company verification statuses for the admin dashboard.

**Key Changes:**
*   Creates `public.get_company_verification_stats()`: A `SECURITY DEFINER` function.
    *   Requires the caller to be an admin (via `internal.is_admin(auth.uid())`).
    *   Returns a table with columns: `status VARCHAR(20)` and `count BIGINT`.
    *   Groups companies by `verification_status` and counts them.
*   Grants `EXECUTE` on this function to `authenticated` and `service_role`.

---

## `20250517000000_add_verification_status_notifications.sql`

**Purpose:** Modifies the `admin_update_company_verification` RPC to automatically send a message to the company owner when their company's verification status is changed by an admin.

**Key Changes:**
*   Re-defines the `public.admin_update_company_verification` function.
*   The function now includes logic to:
    1.  Look up the `system_user_id` from `public.profiles` using a predefined admin email (e.g., 'rmarshall@itmarshall.net').
    2.  After successfully updating the company's verification status and admin notes, it retrieves the `company_owner_id`.
    3.  Constructs a message detailing the company name, the new verification status (using a user-friendly display name), and any admin notes.
    4.  Inserts this message into the `public.messages` table, with the system user as the sender and the company owner as the receiver.
*   Includes error handling for message insertion to prevent the main transaction from failing and avoids sending a message if the company owner is the system user.
*   The function remains `SECURITY DEFINER` and relies on the existing RLS policy for `public.messages` that allows the `postgres` session user (acting as the system admin profile) to send messages. 

---

## `20250518000000_create_request_tier2_verification_rpc.sql`

**Purpose:** Creates a PostgreSQL RPC function that allows company owners to apply for Tier 2 verification after successfully completing Tier 1.

**Key Changes:**
*   Creates the function `public.request_company_tier2_verification(p_company_id UUID)`:
    *   This is a `LANGUAGE plpgsql` function with `SECURITY DEFINER` privileges.
    *   It takes the company ID as input.
    *   **Validation:**
        *   Checks if the company exists.
        *   Verifies that the `auth.uid()` of the caller matches the `owner_id` of the company.
        *   Ensures the company is eligible for a Tier 2 application (i.e., its current `verification_status` must be 'TIER1_VERIFIED').
    *   **Action:**
        *   Updates the `public.companies` table for the specified `p_company_id`.
        *   Changes the `verification_status` to 'TIER2_PENDING'.
*   Grants `EXECUTE` permission on this new function to the `authenticated` role, allowing logged-in, Tier 1 verified company owners to call it. 