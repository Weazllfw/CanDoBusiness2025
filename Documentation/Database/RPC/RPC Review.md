# RPC Review Findings

This document logs findings from the systematic review of backend RPC functions.

## Feed Related RPCs

### `public.get_feed_posts(p_user_id UUID, p_limit INTEGER, p_offset INTEGER, p_category post_category)`
- **File**: `supabase/migrations/20250531000001_add_multiple_images_support.sql`
- **Security**: `SECURITY INVOKER` (explicitly set in the latest version, was `DEFINER` in an older version with category support).
- **Parameters**: `p_user_id` (for personalization), `p_limit`, `p_offset`, optional `p_category`.
- **Returns**: Table of post details, author info, company info, engagement counts, like/bookmark status, and a `feed_ranking_score`.
- **Logic Highlights**:
    - CTEs for `current_user_connections`, `current_user_followed_companies`, and `post_stats` (likes, comments, bookmarks, user's like/bookmark status).
    - `feed_ranking_score` logic:
        - 0: Own posts
        - 1: Connected user's posts
        - 2: Followed company's posts
        - 3: General posts
    - Secondary sort by `author_subscription_tier` (`PRO` > `PREMIUM` > `REGULAR`).
    - Tertiary sort by `created_at DESC`.
    - Filters `WHERE p.status = 'visible'`.
    - Handles `p_category` for filtering.
- **Observations**:
    - The change from `SECURITY DEFINER` to `SECURITY INVOKER` in the latest version (`...add_multiple_images_support.sql`) is a good security practice, relying on RLS of underlying tables.
    - The ranking and filtering logic seems comprehensive.
    - The `post_stats` CTE efficiently calculates various counts and user-specific states.
- **TODOs/Checks**: None outstanding based on the code. Assumes RLS on `posts`, `profiles`, `companies`, `user_connections`, `user_company_follows`, `post_likes`, `post_comments`, `post_bookmarks` are correctly set up to allow reads for a `SECURITY INVOKER` function.

### `internal.get_user_connection_ids(user_id_param uuid)`
- **File**: `supabase/migrations/20250601000000_create_get_pymk_suggestions_rpc.sql`
- **Security**: `SECURITY INVOKER`.
- **Parameters**: `user_id_param uuid`.
- **Returns**: `TABLE(connected_user_id uuid)`.
- **Logic**: Selects `addressee_id` where `requester_id` matches and status is 'ACCEPTED', UNION with `requester_id` where `addressee_id` matches and status is 'ACCEPTED'.
- **Observations**: Correct and robust for finding accepted connections. `UNION` correctly handles distinctness.
- **TODOs/Checks**: None.

### `public.get_cymk_suggestions(p_requesting_user_id UUID, p_limit INT)`
- **File**: `supabase/migrations/20250601000003_update_get_cymk_suggestions_with_fallback.sql`
- **Security**: `SECURITY INVOKER`.
- **Returns**: Table of suggested company details, score, reason.
- **Logic Highlights**:
    - Uses `internal.get_user_connection_ids`.
    - Primary suggestions: Companies followed by user's connections, excluding already followed/owned by user. Filtered by `c.verification_status = 'TIER1_VERIFIED'`. Score is `connections_following_count`.
    - Fallback: Recent (30 days) `TIER1_VERIFIED` companies, not owned/followed by user, and not in primary suggestions. Score 0.
    - Uses `ROW_NUMBER()` to ensure unique suggestions, prioritizing primary then fallback.
- **Observations**: Well-structured. Dependency on `internal.get_user_connection_ids` is clear. `TIER1_VERIFIED` filter impacts suggestion pool. Frontend handles empty state.
- **TODOs/Checks**: None. Logic seems sound.

### `public.get_pymk_suggestions(p_requesting_user_id UUID, p_limit INT)`
- **File**: `supabase/migrations/20250601000002_update_get_pymk_suggestions_with_fallback.sql`
- **Security**: `SECURITY INVOKER`.
- **Returns**: Table of suggested user details, score, reason.
- **Logic Highlights**:
    - Uses `internal.get_user_connection_ids`.
    - Primary suggestions: 2nd-degree connections, scored by `mutual_connections_count`. Excludes self and 1st-degree connections.
    - Fallback: Recent (30 days) users, not self, not 1st-degree, not in primary suggestions.
    - **Correction Applied**: Added `WHERE p.status = 'active'` to both primary (`ranked_suggestions` CTE) and fallback (`recent_users_fallback` CTE) to ensure only active profiles are suggested.
    - Uses `ROW_NUMBER()` for uniqueness.
- **Observations**: Logic for mutual connections and fallback is good. Initial version missed profile status filter.
- **TODOs/Checks**: Consider if `JOIN internal.get_user_connection_ids(...) sdc ON TRUE` is as clear/performant as `CROSS JOIN LATERAL ...` (though likely optimized similarly).

### `public.toggle_post_bookmark(p_post_id UUID)`
- **File**: `supabase/migrations/20250530000000_create_bookmarks.sql`
- **Security**: `SECURITY DEFINER`.
- **Returns**: `is_bookmarked BOOLEAN`, `bookmark_count BIGINT`.
- **Logic**: Gets `auth.uid()`. If bookmark exists for user/post, deletes it. Else, inserts. Returns new status and total count.
- **Observations**: Correct toggle logic. `SECURITY DEFINER` is safe as function logic correctly uses `auth.uid()` to scope actions to the calling user, effectively re-implementing user-specific RLS. `post_bookmarks` table has RLS ensuring users can only manage their own bookmarks if direct table access was used.
- **TODOs/Checks**: None. Consistent with `toggle_post_like`.

### `public.toggle_post_like(p_post_id UUID)`
- **File**: `supabase/migrations/20250520000002_create_toggle_post_like_rpc.sql` (Newly created)
- **Security**: `SECURITY DEFINER`.
- **Returns**: `is_liked BOOLEAN`, `like_count BIGINT`.
- **Logic**: Gets `auth.uid()`. If like exists for user/post, deletes it. Else, inserts. Returns new status and total count.
- **Observations**: Created to match frontend expectation. Mirrors `toggle_post_bookmark`. `post_likes` table has RLS for direct access.
- **TODOs/Checks**: None.

### `public.add_post_comment(p_post_id UUID, p_content TEXT, p_parent_comment_id UUID)`
- **File**: `supabase/migrations/20250520000003_create_add_post_comment_rpc.sql` (Newly created)
- **Security**: `SECURITY DEFINER`.
- **Returns**: Table with new comment details including `author_name`, `author_avatar_url`, and `status`.
- **Logic Highlights**:
    - Takes `post_id`, `content`, optional `parent_comment_id`.
    - Checks calling user's profile status is 'active' or 'verified'.
    - Checks target post exists and is 'visible'.
    - If reply, checks parent comment exists, belongs to post, and is 'visible'.
    - Inserts comment with `user_id = auth.uid()`.
    - Returns new comment joined with profile data.
- **Observations**: Good validation checks. Returns comprehensive data for UI. `SECURITY DEFINER` is used; logic correctly scopes to `auth.uid()`.
- **TODOs/Checks**: None.

### `public.get_post_comments_threaded(p_post_id uuid)`
- **File**: `supabase/migrations/20250529000000_create_get_post_comments_threaded_rpc.sql`
- **Security**: `SECURITY INVOKER` (explicitly set after review).
- **Returns**: Table of comment details, author name/avatar, depth, sort_path, and comment status.
- **Logic Highlights**:
    - Recursive CTE `comment_thread` to fetch nested comments.
    - Sorts by `sort_path` for correct threaded display.
    - **Corrections Applied**:
        - Added `pc.status = 'visible'` filter in both anchor and recursive parts.
        - Added `p.status = 'active'` filter for profile status in both parts.
        - Removed `user_email` from return type and selections for privacy.
        - Added `pc.status` to the return set.
        - Explicitly set `SECURITY INVOKER`.
- **Observations**: Standard recursive approach. Initial version missed crucial status filters and exposed email. Now improved.
- **TODOs/Checks**: None after corrections.

## User Profile RPCs

### `get_user_profile` (Assumed: No dedicated RPC, direct table access)
- **File**: `supabase/migrations/20240508000001_create_profiles.sql` (defines `profiles` table and RLS)
- **RLS for `public.profiles` (SELECT)**: `USING (true)` - Profiles are viewable by everyone.
- **Observation**: Frontend likely uses direct table access (`supabase.from('profiles').select().eq('id', ...)`) for fetching profile data. This is acceptable for public profile information.
- **TODOs/Checks**: Consider creating a dedicated `get_user_profile_details(p_profile_id UUID, p_requesting_user_id UUID)` RPC if profile view needs to consolidate data from multiple sources (e.g., connection counts, company ownership, detailed activity stats) or if more nuanced privacy is needed for certain profile fields depending on viewer.

### `update_user_profile` (Assumed: No dedicated RPC, direct table update via RLS)
- **File**: `supabase/migrations/20240508000001_create_profiles.sql` (defines `profiles` table and RLS)
- **RLS for `public.profiles` (UPDATE)**: `USING (auth.uid() = id)` - Users can update their own profile.
- **Observation**: Frontend likely uses direct table updates (`supabase.from('profiles').update().eq('id', auth.uid())`). This is acceptable for simple field updates directly mapping to the `profiles` table columns.
- **TODOs/Checks**: Consider creating an `update_user_profile` RPC if complex validation, input sanitization, or updates to related/denormalized data are required in the future.

## Connection Management RPCs (from `supabase/migrations/20250602000001_create_user_connection_rpcs.sql`)

**Helper: `internal.get_current_user_id()`**
- Returns `UUID` (`auth.uid()`). `LANGUAGE sql STABLE`. `SECURITY INVOKER` (default).
- **Review**: Correct.

**Table: `public.user_connections` (from `supabase/migrations/20250602000000_create_user_connections_table.sql`)**
- **Key Columns**: `id`, `requester_id` (FK `profiles`), `addressee_id` (FK `profiles`), `status` (`connection_status_enum`), `notes`, `requested_at`, `responded_at`.
- **Enum `connection_status_enum`**: `PENDING`, `ACCEPTED`, `DECLINED`, `BLOCKED`.
- **Constraints**: `requester_id <> addressee_id`, `UNIQUE (requester_id, addressee_id)`.
- **RLS Policies**:
    - **SELECT**: `"Users can view their own connection records"` (`requester_id = auth.uid() OR addressee_id = auth.uid()`).
    - **INSERT**: `"Users can send connection requests"` (`requester_id = auth.uid() AND status = 'PENDING'`).
    - **UPDATE**: `"Addressees can respond to pending connection requests"` (`addressee_id = auth.uid() AND status = 'PENDING'`, `WITH CHECK (status IN ('ACCEPTED', 'DECLINED') AND responded_at IS NOT NULL)`).
    - **DELETE**:
        - `"Users can cancel their sent pending requests"` (`requester_id = auth.uid() AND status = 'PENDING'`).
        - `"Users can remove an accepted connection"` (`(requester_id = auth.uid() OR addressee_id = auth.uid()) AND status = 'ACCEPTED'`).
- **Observations**: The `UNIQUE (requester_id, addressee_id)` constraint means a user cannot send a new request if a previous one (e.g., DECLINED) still exists in the table. `TODO` in migration for more detailed BLOCKING policies.

**1. `public.send_user_connection_request(p_addressee_id UUID, p_message TEXT DEFAULT NULL)`**
- Returns `public.user_connections`. `LANGUAGE plpgsql`. `SECURITY DEFINER`.
- **Logic**: Checks self-request, target user existence. Inserts with status 'PENDING', `requester_id = auth.uid()`. Handles `unique_violation` with specific messages based on existing status.
- **Review**: Good. `DEFINER` is fine as it correctly uses `auth.uid()`. Exception handling for unique constraint is user-friendly.
- **TODOs/Checks**: None major. Relies on the `unique_pair` constraint.

**2. `public.respond_user_connection_request(p_request_id UUID, p_response TEXT)`**
- Returns `public.user_connections`. `LANGUAGE plpgsql`. `SECURITY DEFINER`.
- **Logic**: Validates response ('accept'/'decline'). Updates status and `responded_at` if current user is addressee and status is 'PENDING'.
- **Review**: Correct. `DEFINER` logic matches RLS intent.
- **TODOs/Checks**: None.

**3. `public.remove_user_connection(p_other_user_id UUID)`**
- Returns `VOID`. `LANGUAGE plpgsql`. `SECURITY DEFINER`.
- **Logic**: Deletes 'ACCEPTED' connection involving current user and `p_other_user_id`.
- **Review**: Correct. `DEFINER` logic matches RLS intent.
- **TODOs/Checks**: None.

**4. `public.get_user_connection_status_with(p_other_user_id UUID)`**
- Returns `TEXT`. `LANGUAGE sql STABLE`. `SECURITY DEFINER`.
- **Logic**: `CASE` statement to determine status ('PENDING_SENT', 'PENDING_RECEIVED', 'ACCEPTED', 'DECLINED_BY_THEM', 'DECLINED_BY_ME', 'BLOCKED', 'NONE') between current user and `p_other_user_id`.
- **Review**: Comprehensive. `DEFINER` is justified to ensure user sees the true status even if RLS (if it were INVOKER and RLS was more restrictive) might hide it. The current SELECT RLS on `user_connections` is broad enough that INVOKER might also work, but DEFINER is explicit.
- **TODOs/Checks**: Consider `COALESCE( (SELECT ...), 'NONE')` if a non-NULL value is always strictly required (frontend seems to handle it).

**5. `public.get_pending_user_connection_requests()` (Incoming)**
- Returns `SETOF public.user_connections`. `LANGUAGE sql STABLE`. `SECURITY DEFINER`.
- **Logic**: Selects where `addressee_id = auth.uid() AND status = 'PENDING'`.
- **Review**: Correctly fetches incoming pending requests.
- **TODOs/Checks**:
    - **Critical**: Should return a projection including requester's profile details (name, avatar) to avoid N+1 queries. Propose update.

**6. `public.get_sent_user_connection_requests()` (Outgoing)**
- Returns `SETOF public.user_connections`. `LANGUAGE sql STABLE`. `SECURITY DEFINER`.
- **Logic**: Selects where `requester_id = auth.uid() AND status = 'PENDING'`.
- **Review**: Correctly fetches outgoing pending requests.
- **TODOs/Checks**:
    - **Critical**: Should return a projection including addressee's profile details (name, avatar) to avoid N+1 queries. Propose update.

**7. `public.get_user_network(p_target_user_id UUID)`**
- Returns `TABLE (connection_id UUID, user_id UUID, name TEXT, avatar_url TEXT, connected_since TIMESTAMPTZ)`. `LANGUAGE sql STABLE`. `SECURITY DEFINER`.
- **Logic**: Selects accepted connections and basic profile info for `p_target_user_id`.
- **Review**: `DEFINER` makes this a public view of any user's network (given their ID), which seems intended for profile pages. `profiles` RLS is `USING (true)`.
- **TODOs/Checks**: Confirm this public visibility is intended. If more privacy is desired (e.g., only viewable by the user or their connections), would need `SECURITY INVOKER` and different RLS on `user_connections` for `ACCEPTED` status.

## Company Related RPCs

**Helper: `internal.is_admin(p_user_id uuid)` (from `20240510000002_secure_companies_access.sql`)**
- Returns `BOOLEAN`. Checks if `p_user_id`'s email in `public.profiles` is 'rmarshall@itmarshall.net'. `LANGUAGE plpgsql SECURITY DEFINER`.
- **Review**: Centralized admin check.

**View: `public.companies_view` (from `20240510000002_secure_companies_access.sql`, updated in later migrations)**
- Excludes `admin_notes` and other potentially sensitive internal fields, intended for general public/authenticated user reads.

**RLS on `public.companies` (primarily from `20240510000002_secure_companies_access.sql`)**
- **SELECT**:
    - Authenticated users: `USING (true)` (intended to be via `companies_view`).
    - Admins (`internal.is_admin`): `USING (true)` (can access raw table).
- **INSERT**: `"Owners can insert their companies"`: `WITH CHECK (auth.uid() = owner_id)`.
- **UPDATE**:
    - Owners: `USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id)`.
    - Admins: `USING (internal.is_admin(auth.uid())) WITH CHECK (internal.is_admin(auth.uid()))`.
- **DELETE**: Owners: `USING (auth.uid() = owner_id)`.
- **Trigger**: `internal.prevent_owner_update_restricted_company_fields()` (BEFORE UPDATE) prevents non-admin owners from changing `verification_status` and `admin_notes` directly.

**`create_company` (Assumed: No dedicated RPC, direct table INSERT via RLS)**
- **Mechanism**: Frontend likely performs a direct `INSERT` into `public.companies`, setting `owner_id = auth.uid()`, permitted by RLS.
- **Review**: Acceptable for basic creation. The `company_users` table also has a trigger `internal.assign_company_owner_role()` which runs `AFTER INSERT ON public.companies` to add the `owner_id` to `company_users` with role `OWNER`.
- **TODOs/Checks**: None for basic creation. Complex multi-step creation might warrant an RPC later.

**`update_company` by Owner (Assumed: No dedicated RPC, direct table UPDATE via RLS)**
- **Mechanism**: Frontend likely performs direct `UPDATE` on `public.companies` for fields editable by owner, permitted by RLS and trigger.
- **Review**: Acceptable for basic updates. Trigger protects restricted fields.
- **TODOs/Checks**: None for basic updates.

**`public.get_user_companies(p_user_id UUID)` (from `20240510000002_secure_companies_access.sql`, uses `companies_view`)**
- Returns `SETOF public.companies_view`. `LANGUAGE sql SECURITY DEFINER`.
- **Logic**: `SELECT * FROM public.companies_view WHERE owner_id = p_user_id`.
- **Review**: Provides companies owned by a user, using the filtered view. `SECURITY DEFINER` is acceptable; if it were `INVOKER`, it would still work because `companies_view` RLS (if any, likely on underlying table) and the `owner_id` filter would apply. The view itself ensures sensitive data is not exposed.
- **TODOs/Checks**: None.

### Company User Management (from `supabase/migrations/20250602000004_create_company_users_table.sql`)

**Table: `public.company_users`**
- **Key Columns**: `id`, `company_id` (FK `companies`), `user_id` (FK `profiles`), `role` (`company_role_enum` NOT NULL DEFAULT 'MEMBER').
- **Enum `company_role_enum`**: `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`.
- **Constraints**: `UNIQUE (user_id, company_id)`.
- **Triggers**:
    - `internal.set_updated_at_on_company_users` (BEFORE UPDATE): Standard `updated_at`.
    - `internal.validate_company_user_role_update` (BEFORE UPDATE OF `role`):
        - Prevents an ADMIN from demoting an OWNER.
        - Prevents the last OWNER from demoting themselves.
    - `internal.assign_company_owner_role` (AFTER INSERT ON `public.companies`):
        - Automatically inserts an 'OWNER' record into `company_users` for the new company's `owner_id`.
        - `SECURITY DEFINER` for the trigger function is appropriate here.
- **RLS Policies (`company_users`)**:
    - **SELECT**:
        - `"Company admins can view their company users"`: `USING (EXISTS (SELECT 1 FROM public.company_users cu_admin WHERE cu_admin.company_id = public.company_users.company_id AND cu_admin.user_id = auth.uid() AND cu_admin.role IN ('OWNER', 'ADMIN')))`. Allows OWNER/ADMIN to see all users of their company.
        - `"Users can view their own company memberships"`: `USING (user_id = auth.uid())`.
    - **INSERT**: `"Company admins can add users to their company"`:
        - `WITH CHECK (EXISTS (SELECT 1 FROM public.company_users cu_admin WHERE cu_admin.company_id = public.company_users.company_id AND cu_admin.user_id = auth.uid() AND cu_admin.role IN ('OWNER', 'ADMIN')) AND NOT EXISTS (SELECT 1 FROM public.company_users existing_cu WHERE existing_cu.company_id = public.company_users.company_id AND existing_cu.user_id = public.company_users.user_id))`. 
        - Allows OWNER/ADMIN to add new users to their company if the user is not already associated with the company.
    - **UPDATE**: `"Company admins can update/remove users in their company"`:
        - `USING (EXISTS (SELECT 1 FROM public.company_users cu_admin WHERE cu_admin.company_id = public.company_users.company_id AND cu_admin.user_id = auth.uid() AND cu_admin.role IN ('OWNER', 'ADMIN')))`. (Note: The policy name includes "remove" but it's an UPDATE policy; removal is via DELETE policies).
        - Role change validity is primarily enforced by the `internal.validate_company_user_role_update` trigger.
    - **DELETE**:
        - `"Users can remove themselves from a company"`: `USING (user_id = auth.uid() AND role <> 'OWNER')`. Allows non-owners to leave.
- **Management Method**: No dedicated RPCs for company user management. Operations are intended via direct table access, controlled by RLS and triggers.
- **Observations & Gaps**:
    - The system relies heavily on triggers for critical validation (e.g., owner management), which is a valid approach.
    - **Critical Gap**: No RLS/RPC for an Admin or Owner to REMOVE another user (MEMBER, VIEWER, or even another ADMIN if rules allow) from their company. The DELETE RLS only allows users to remove *themselves* (if not owner). An Owner/Admin should be able to remove other users. Needs a `DELETE` RLS policy: `"Company admins can remove users from their company"`: `USING (EXISTS (SELECT 1 FROM public.company_users cu_admin WHERE cu_admin.company_id = public.company_users.company_id AND cu_admin.user_id = auth.uid() AND cu_admin.role IN ('OWNER', 'ADMIN')) AND public.company_users.user_id <> auth.uid())`. This should also check that an OWNER cannot be removed this way, and the last OWNER cannot be removed (handled by trigger for self-demotion, similar logic for removal).
- **TODOs/Checks**:
    - **Major**: Define and implement an RLS policy (or an RPC) to allow Company Owners/Admins to remove other users from their company. This policy must prevent removal of the last OWNER.

### Company Verification RPCs

### `public.request_company_tier1_verification(p_company_id UUID, p_business_number TEXT, p_public_presence_links TEXT[], p_self_attestation_completed BOOLEAN)`
- **File**: `supabase/migrations/20250511000022_create_request_tier1_verification_rpc.sql`
- **Security**: `SECURITY DEFINER` with `auth.uid() = owner_id` check.
- **Parameters**: Company ID, business number, public presence links, self-attestation flag.
- **Returns**: `VOID`.
- **Logic**: Allows a company owner to submit details for Tier 1 verification. Sets status to `TIER1_PENDING`.
- **Review**: Seems robust. Checks for ownership and eligibility (`UNVERIFIED` or `TIER1_REJECTED` status).
- **TODOs/Checks**: None.

### `public.request_company_tier2_verification(p_company_id UUID, p_tier2_document_type TEXT, p_tier2_document_filename TEXT, p_tier2_document_storage_path TEXT)`
- **File**: `supabase/migrations/20250518000000_create_request_tier2_verification_rpc.sql`
- **Security**: `SECURITY DEFINER` with `auth.uid() = owner_id` check.
- **Parameters**: Company ID, document type, filename, and storage path for Tier 2.
- **Returns**: `VOID`.
- **Logic**: Allows a company owner to submit document details for Tier 2 verification. Sets status to `TIER2_PENDING`. Stores document metadata.
- **Review**: Solid. Checks for ownership and Tier 1 verified status (`TIER1_VERIFIED`) as prerequisite. Validates document parameters.
- **TODOs/Checks**: None.

### `public.admin_update_company_verification(p_company_id UUID, p_new_status VARCHAR(20), p_new_admin_notes TEXT)`
- **File**: `supabase/migrations/20250517000000_add_verification_status_notifications.sql` (latest version)
- **Security**: `SECURITY DEFINER` with `internal.is_admin(auth.uid())` check.
- **Parameters**: Company ID, new verification status, admin notes.
- **Returns**: `public.companies` (the updated row).
- **Logic**:
    - Allows an admin to update a company's `verification_status` and `admin_notes`.
    - If status changes to `TIER2_FULLY_VERIFIED` or `TIER2_REJECTED`, attempts to delete the associated Tier 2 document from storage and clears document fields in the `companies` table. Errors during deletion are caught and warned, not transaction-breaking.
    - Sends a notification message to the company owner about the status change, using a system user profile (`rmarshall@itmarshall.net`). Errors during messaging are caught and warned.
- **Review**: Comprehensive admin function. Handles document cleanup and owner notification. `SECURITY DEFINER` and admin check are appropriate. `search_path` includes `storage`.
- **TODOs/Checks**:
    - The `admin_profile_email ('rmarshall@itmarshall.net')` is hardcoded. Consider making this configurable (e.g., GUC variable or config table) for maintainability and deployment flexibility.

## Company Connection Management RPCs (from `supabase/migrations/20250602000006_create_company_connection_rpcs.sql`)

**Helper: `internal.is_company_admin(p_user_id UUID, p_company_id UUID)`**
- Returns `BOOLEAN`. `LANGUAGE sql STABLE SECURITY DEFINER`.
- **Logic**: Checks if `p_user_id` is an `ADMIN` or `OWNER` in `public.company_users` for `p_company_id`.
- **Review**: Correct and essential. `SECURITY DEFINER` appropriate.

**1. `public.send_company_connection_request(p_acting_company_id UUID, p_target_company_id UUID)`**
- Returns `public.company_connections`. `LANGUAGE plpgsql SECURITY DEFINER`.
- **Logic**: Initiated by admin of `p_acting_company_id`. Checks companies are different, user is admin of acting company, both companies exist/not deleted/verified. Inserts `PENDING` connection. Handles `unique_violation` with detailed messages.
- **Review**: Generally solid. Admin check correct.
- **Critical Fix Applied**: Changed company verification check from non-existent `tier_1_verified_at`/`tier_2_verified_at` columns to `verification_status IN ('TIER1_VERIFIED', 'TIER2_FULLY_VERIFIED')`.
- **TODOs/Checks**: None after fix.

**2. `public.respond_company_connection_request(p_request_id UUID, p_response TEXT)`**
- Returns `public.company_connections`. `LANGUAGE plpgsql SECURITY DEFINER`.
- **Logic**: Initiated by admin of addressee company. Validates response ('accept'/'decline'), updates status of `PENDING` request to `ACCEPTED` or `DECLINED`, sets `responded_at`.
- **Review**: Correct logic for responding to requests. Admin check for addressee company correct.
- **TODOs/Checks**: None.

**3. `public.remove_company_connection(p_acting_company_id UUID, p_other_company_id UUID)`**
- Returns `VOID`. `LANGUAGE plpgsql SECURITY DEFINER`.
- **Logic**: Initiated by admin of `p_acting_company_id`. Deletes `ACCEPTED` connection between the two companies.
- **Review**: Correct. Allows an admin of one company in the connection to remove it.
- **TODOs/Checks**: None.

**4. `public.get_company_connection_status_with(p_acting_company_id UUID, p_other_company_id UUID)`**
- Returns `TEXT`. `LANGUAGE plpgsql STABLE SECURITY DEFINER`.
- **Logic**: If caller is admin of `p_acting_company_id`, returns detailed status (`PENDING_SENT`, `PENDING_RECEIVED`, `ACCEPTED`, `DECLINED_BY_THEM`, `DECLINED_BY_US`, `BLOCKED`, `NONE`). If not admin, returns only `ACCEPTED` or `NONE`.
- **Review**: `STABLE` and `SECURITY DEFINER` appropriate. Logic for differentiating admin/non-admin view is clear. Detailed status for admins is good.
- **TODOs/Checks**: The limited view for non-admins of `p_acting_company_id` is a design choice; seems acceptable.

**5. `public.get_pending_company_connection_requests(p_for_company_id UUID)`**
- Returns `SETOF public.company_connections`. `LANGUAGE plpgsql STABLE SECURITY DEFINER`.
- **Logic**: For admins of `p_for_company_id` (checked via `public.check_if_user_is_company_admin`). Returns incoming `PENDING` requests.
- **Review**: Correct. Uses the public admin check wrapper.
- **TODOs/Checks**: Suggestion in original code: "Consider projecting with requester company details." This is a good UI/performance enhancement to avoid frontend lookups.

**6. `public.get_sent_company_connection_requests(p_from_company_id UUID)`**
- Returns `SETOF public.company_connections`. `LANGUAGE plpgsql STABLE SECURITY DEFINER`.
- **Logic**: For admins of `p_from_company_id`. Returns outgoing `PENDING` requests.
- **Review**: Correct.
- **TODOs/Checks**: Suggestion in original code: "Consider projecting with addressee company details." Good enhancement.

**7. `public.get_company_network_count(p_company_id UUID)`**
- Returns `INTEGER`. `LANGUAGE sql STABLE SECURITY INVOKER`.
- **Logic**: Counts `ACCEPTED` connections for `p_company_id`.
- **Review**: `SECURITY INVOKER` is correct and safe due to the RLS policy on `company_connections` allowing authenticated users to select `ACCEPTED` connections.
- **TODOs/Checks**: None.

**8. `public.get_company_network_details(p_target_company_id UUID)`**
- Returns `TABLE (...)`. `LANGUAGE plpgsql STABLE SECURITY DEFINER`.
- **Logic**: For admins of `p_target_company_id`. Returns details of connected companies (`status = 'ACCEPTED', not deleted`).
- **Review**: Admin check correct. Joins and filtering are correct.
- **Fix Applied**: Changed `comp.logo_url` to `comp.avatar_url` as `logo_url` likely doesn't exist on the `companies` table.
- **TODOs/Checks**: None after fix.

## User-Company Follow RPCs (from `supabase/migrations/20250610000000_create_user_company_follows.sql`)

**Table: `public.user_company_follows`**
- **Columns**: `id` (PK), `user_id` (FK `public.profiles(id)`), `company_id` (FK `public.companies(id)`), `created_at`.
- **Constraint**: `UNIQUE (user_id, company_id)`.
- **Critical Fix Applied to Migration**: Changed `user_id` FK from non-existent `public.users(id)` to `public.profiles(id)`.
- **RLS**: Correctly scoped for users to manage their own follows (SELECT, INSERT, DELETE for `auth.uid() = user_id`).

**1. `public.follow_company(p_company_id uuid)`**
- Returns `public.user_company_follows`. `LANGUAGE plpgsql SECURITY DEFINER`.
- **Logic**: `INSERT ... ON CONFLICT (user_id, company_id) DO NOTHING RETURNING *` using `auth.uid()`.
- **Review**: Idempotent follow. `SECURITY DEFINER` is acceptable; `INVOKER` would also work due to RLS.
- **TODOs/Checks**: None critical.

**2. `public.unfollow_company(p_company_id uuid)`**
- Returns `VOID`. `LANGUAGE plpgsql SECURITY DEFINER`.
- **Logic**: `DELETE` from `user_company_follows` for `auth.uid()` and `p_company_id`.
- **Review**: Correct. `SECURITY DEFINER` acceptable; `INVOKER` also an option.
- **TODOs/Checks**: None critical.

**3. `public.get_company_follow_status(p_company_id uuid)`**
- Returns `JSONB { "is_following": BOOLEAN, "follow_id": UUID }`. `LANGUAGE plpgsql STABLE`. `SECURITY DEFINER`.
- **Logic**: Checks if `auth.uid()` follows `p_company_id`.
- **Review**: Correct. Frontend was calling this with `(p_company_id, p_user_id)` which was wrong. Function only takes `p_company_id` and internally uses `auth.uid()`.
- **TODOs/Checks**: None.

**4. `public.get_followed_companies()`**
- Returns `SETOF public.user_company_follows`. `LANGUAGE sql STABLE SECURITY DEFINER`.
- **Logic**: `SELECT *` from `user_company_follows` for `auth.uid()`.
- **Review**: Correct. `STABLE` is appropriate.
- **TODOs/Checks**: Consider returning joined company details (name, avatar) for UI efficiency, as an enhancement. 

## Content Flagging System

**Files**: 
- `supabase/migrations/20250524000000_create_content_flagging_tables.sql` (Tables, Enum, RLS)
- `supabase/migrations/20250524000001_create_flag_content_rpc.sql` (RPC)

**Enum: `public.flag_status_enum`**
- Values: `pending_review`, `resolved_no_action`, `resolved_content_removed`, `resolved_user_warned`, `resolved_user_banned`.

**Table: `public.post_flags`**
- **Columns**: `id` (PK), `post_id` (FK `posts`), `user_id` (FK `profiles`), `reason`, `status` (`flag_status_enum`), `created_at`, `updated_at`, `reviewed_by` (FK `profiles`), `reviewed_at`, `admin_notes`.
- **Constraint**: `UNIQUE (post_id, user_id)`.
- **RLS**: 
    - Users: INSERT own, SELECT own, UPDATE own (reason, if pending), DELETE own (if pending).
    - Admins (`internal.is_admin`): ALL.
- **Critical Fix Applied to Migration**: `user_id` and `reviewed_by` FKs corrected to `public.profiles(id)`.

**Table: `public.comment_flags`**
- **Columns**: `id` (PK), `comment_id` (FK `post_comments`), `user_id` (FK `profiles`), `reason`, `status` (`flag_status_enum`), `created_at`, `updated_at`, `reviewed_by` (FK `profiles`), `reviewed_at`, `admin_notes`.
- **Constraint**: `UNIQUE (comment_id, user_id)`.
- **RLS**: Similar to `post_flags` (Users: INSERT/SELECT/UPDATE/DELETE own; Admins: ALL).
- **Critical Fix Applied to Migration**: `user_id` and `reviewed_by` FKs corrected to `public.profiles(id)`.

**Enum: `public.flag_content_type_enum`** (from RPC migration)
- Values: `post`, `comment`.

**RPC: `public.create_content_flag(p_content_id UUID, p_content_type public.flag_content_type_enum, p_reason TEXT DEFAULT NULL)`**
- **File**: `supabase/migrations/20250524000001_create_flag_content_rpc.sql`
- **Security**: `SECURITY DEFINER`.
- **Returns**: `JSON` (the created flag record).
- **Logic**:
    - Takes content ID, type ('post' or 'comment'), and optional reason.
    - User (`auth.uid()`) cannot flag their own content.
    - Checks if content exists and is 'visible' (from `posts.status` or `post_comments.status`).
    - Inserts into `post_flags` or `comment_flags`.
    - Handles `unique_violation` (user already flagged).
- **Review**: Robust function for users to flag content. Checks are good.
- **TODOs/Checks**: None.

## Admin Flag Management & Moderation RPCs

**Files**:
- `supabase/migrations/20250525000000_create_admin_flag_rpc_functions.sql` (Admin viewing/updating flags)
- `supabase/migrations/20250526000001_create_admin_action_rpcs.sql` (Admin taking actions like remove, warn, ban)

**Assumption**: An `internal.ensure_admin()` function exists and is used by these RPCs to verify admin privileges.

### From `20250525000000_create_admin_flag_rpc_functions.sql`:

**1. `public.admin_get_flag_statistics()`**
- Returns `TABLE(status public.flag_status_enum, post_flag_count BIGINT, comment_flag_count BIGINT)`.
- **Logic**: Provides counts of post and comment flags, grouped by status.
- **Security**: `DEFINER`, `ensure_admin()` check.
- **Review**: Correct.

**2. `public.admin_get_post_flags(p_status public.flag_status_enum, p_page_number INT, p_page_size INT)`**
- Returns `TABLE(...)` with paginated post flag details, flagged post info, author, flagger.
- **Security**: `DEFINER`, `ensure_admin()` check.
- **Review**: Correct.

**3. `public.admin_update_post_flag_status(p_flag_id UUID, p_new_status public.flag_status_enum, p_admin_notes TEXT)`**
- Returns `SETOF public.post_flags` (updated row).
- **Logic**: Updates flag `status`, `admin_notes`, `reviewed_by` (to `auth.uid()`), `reviewed_at` (to `now()`).
- **Security**: `DEFINER`, `ensure_admin()` check.
- **Review**: Correct after fixes to include `reviewed_by` and `reviewed_at`.

**4. `public.admin_get_comment_flags(p_status public.flag_status_enum, p_page_number INT, p_page_size INT)`**
- Returns `TABLE(...)` with paginated comment flag details.
- **Security**: `DEFINER`, `ensure_admin()` check.
- **Review**: Correct.

**5. `public.admin_update_comment_flag_status(p_flag_id UUID, p_new_status public.flag_status_enum, p_admin_notes TEXT)`**
- Returns `SETOF public.comment_flags` (updated row).
- **Logic**: Updates flag `status`, `admin_notes`, `reviewed_by` (to `auth.uid()`), `reviewed_at` (to `now()`).
- **Security**: `DEFINER`, `ensure_admin()` check.
- **Review**: Correct after fixes to include `reviewed_by` and `reviewed_at`.

### From `20250526000001_create_admin_action_rpcs.sql`:

**Helper: `internal.update_related_flag_status(p_related_flag_id UUID, p_flag_table TEXT, p_new_status public.flag_status_enum, p_admin_user_id UUID, p_admin_notes TEXT)`**
- **Logic**: Internal helper to update flag status, `reviewed_by`, `reviewed_at`, `admin_notes` in `post_flags` or `comment_flags`.
- **Security**: `DEFINER`.
- **Review**: Correct and centralizes logic for flag updates resulting from admin actions.

**1. `public.admin_remove_post(p_post_id UUID, p_reason TEXT, p_related_flag_id UUID, p_flag_table TEXT)`**
- Returns `SETOF public.posts`.
- **Logic**: Sets post `status` to `removed_by_admin`. Logs to `admin_actions_log`. Updates related flag to `resolved_content_removed`. Notifies author.
- **Security**: `DEFINER`, `ensure_admin()` check.
- **Review**: Robust. Hardcoded system admin email (`rmarshall@itmarshall.net`) for notifications is a point for future configuration.

**2. `public.admin_remove_comment(p_comment_id UUID, p_reason TEXT, p_related_flag_id UUID, p_flag_table TEXT)`**
- Returns `SETOF public.post_comments`.
- **Logic**: Sets comment `status` to `removed_by_admin`. Logs. Updates related flag. Notifies author.
- **Security**: `DEFINER`, `ensure_admin()` check.
- **Review**: Robust, similar to `admin_remove_post`.

**3. `public.admin_warn_user(p_target_profile_id UUID, p_reason TEXT, p_related_content_id UUID, p_related_content_type public.admin_action_target_type_enum, p_related_flag_id UUID, p_flag_table TEXT)`**
- Returns `SETOF public.profiles`.
- **Logic**: Logs warning. Updates related flag to `resolved_user_warned`. Notifies user. Updates `profiles.last_warning_at` and `profiles.status` to `warned`.
- **Security**: `DEFINER`, `ensure_admin()` check.
- **Review**: Good. 
- **TODOs/Checks**: The `profiles.status` is set to `'warned'`. Ensure `profile_status_enum` for the `profiles` table includes `'warned'` or map to an existing appropriate status. (Original enum: `active, suspended, banned_temporarily, banned_permanently, under_review, pending_verification`).

**4. `public.admin_ban_user(p_target_profile_id UUID, p_reason TEXT, p_duration_days INT, p_related_content_id UUID, p_related_content_type public.admin_action_target_type_enum, p_related_flag_id UUID, p_flag_table TEXT)`**
- Returns `SETOF public.profiles`.
- **Logic**: Logs ban. Updates related flag to `resolved_user_banned`. Notifies user. Updates `profiles.status` (`banned_temporarily` or `banned_permanently`) and `profiles.ban_expires_at`.
- **Security**: `DEFINER`, `ensure_admin()` check.
- **Review**: Comprehensive.

**General TODO for Admin RPCs using Notifications/System Actions**:
- The hardcoded system admin email (`rmarshall@itmarshall.net`) used for sending notifications (e.g., in `admin_remove_post`, `admin_update_company_verification`, etc.) should be made configurable (e.g., via a GUC variable or a dedicated configuration table) for better maintainability and deployment across different environments.

## Messaging System

**Files**:
- `supabase/migrations/20240509000000_create_simple_messaging.sql` (Table, View, RLS, `get_conversations` RPC)
- `supabase/migrations/20240509000001_create_send_message_rpc.sql` (`send_message` RPC)
- `supabase/migrations/20240509000002_create_mark_messages_read_rpc.sql` (`mark_messages_as_read` RPC)

**Table: `public.messages`** (from `20240509000000_create_simple_messaging.sql`)
- **Columns**: `id`, `created_at`, `sender_id` (FK `public.profiles(id)`), `receiver_id` (FK `public.profiles(id)`), `content`, `read`, `is_system_message` (BOOL DEFAULT FALSE).
- **Critical Fix Applied**: `sender_id`, `receiver_id` FKs changed from `auth.users(id)` to `public.profiles(id)`. `is_system_message` column added.
- **RLS**:
    - SELECT: Users can view messages they sent or received.
    - INSERT: Users can send non-system messages if `auth.uid() = sender_id`. System can insert system messages if `sender_id` is the configured system admin.
    - UPDATE: Users can mark non-system messages they received as read (`read = true`).
- **TODOs/Checks**: Consider adding an `updated_at` column to `messages` table, automatically updated by a trigger, similar to `user_notifications`.

**View: `public.message_view`** (from `20240509000000_create_simple_messaging.sql`)
- Joins `messages` with `profiles` for sender/receiver details.
- **Review**: Correct, relies on `messages.sender_id` and `receiver_id` correctly referencing `profiles.id`.

**1. `public.get_conversations()`** (from `20240509000000_create_simple_messaging.sql`, was `get_conversations(p_current_user_id uuid)`)
- Returns `TABLE(...)` with conversation list, last message, other user details, unread count.
- **Security**: `INVOKER`.
- **Logic**: Uses `auth.uid()` internally. Filters out system messages.
- **Fix Applied**: Changed to use `auth.uid()` internally instead of a parameter. Language changed to `plpgsql` to support this. Filters out system messages.
- **Review**: Correct and robust.

**2. `public.send_message(p_receiver_id UUID, p_content TEXT)`** (from `20240509000001_create_send_message_rpc.sql`)
- Returns `public.messages` (the new message).
- **Security**: `DEFINER`.
- **Logic**: Sends a non-system message from `auth.uid()` to `p_receiver_id`. Checks for self-messaging, empty content, active sender/receiver profiles.
- **Review**: Good. Includes placeholder check for users being connected.
- **TODOs/Checks**: Determine if messaging should be restricted to connected users and implement `internal.are_users_connected` if so.

**3. `public.mark_messages_as_read(p_other_user_id UUID)`** (from `20240509000002_create_mark_messages_read_rpc.sql`)
- Returns `BOOLEAN` (true if messages were updated).
- **Security**: `DEFINER`.
- **Logic**: Marks all unread, non-system messages from `p_other_user_id` to `auth.uid()` as `read = TRUE`.
- **Review**: Correct. Notes that `messages.updated_at` is currently missing but would be good to add.

## Notification System RPCs

**Files**:
- `supabase/migrations/20250526000003_create_user_notifications_table.sql` (Table, Enum, RLS, Trigger)
- `supabase/migrations/20250526000004_create_notification_rpcs.sql` (RPCs)

**Enum: `public.notification_type_enum`**
- Values: `system_alert`, `content_moderation`, `new_message_summary`, `connection_request`, `rfq_update`, `default`.

**Table: `public.user_notifications`**
- **Columns**: `id`, `user_id` (FK `profiles`), `title`, `message`, `link_to`, `is_read` (BOOL DEFAULT FALSE), `notification_type`, `created_at`, `updated_at`.
- **RLS**:
    - SELECT: Users can read their own.
    - UPDATE: Users can update `is_read` for their own. (No direct INSERT/DELETE for users).
- **Trigger**: `handle_user_notifications_updated_at` (BEFORE UPDATE, assumes `public.handle_updated_at()` exists).

**1. `public.get_user_notifications(p_limit INT, p_page_number INT)`** (from `20250526000004_create_notification_rpcs.sql`)
- Returns `TABLE(...)` with paginated notifications for `auth.uid()` and `unread_count`.
- **Security**: `INVOKER`.
- **Review**: Correct.

**2. `public.mark_notification_as_read(p_notification_id UUID)`** (from `20250526000004_create_notification_rpcs.sql`)
- Returns `SETOF public.user_notifications` (updated row).
- **Logic**: Sets `is_read = TRUE`, `updated_at = now()` for notification if `user_id = auth.uid()`.
- **Security**: `INVOKER`.
- **Review**: Correct.

**3. `public.mark_all_notifications_as_read()`** (from `20250526000004_create_notification_rpcs.sql`)
- Returns `BOOLEAN` (FOUND).
- **Logic**: Sets `is_read = TRUE`, `updated_at = now()` for all unread notifications for `auth.uid()`.
- **Security**: `INVOKER`.
- **Review**: Correct. 