# Database and RPC Technical Debt - To Do List

## 1. Critical Gaps & Fixes

### 1.1. Company User Removal
- **Debt**: Owners/Admins cannot remove other users (MEMBER, VIEWER, other ADMINs) from their company via RLS. The current DELETE RLS only allows users to remove *themselves* (if not an owner).
- **Action**: Implement a new RLS `DELETE` policy for `public.company_users`.
- **Resolution**: **RESOLVED**. 
    - The RLS policy `"Company admins can remove users from their company"` was implemented in `supabase/migrations/20250612000000_add_rls_company_admin_remove_users.sql`. 
    - This policy allows company OWNERS or ADMINS to remove other non-OWNER users from their company.
    - Existing RLS policies and triggers also prevent an OWNER from being removed or demoted inappropriately, addressing the concern about the last owner.
- **File(s) to create/modify**: None needed. `20250612000000_add_rls_company_admin_remove_users.sql` already exists.

### 1.2. N+1 Queries in Connection RPCs
- **Debt**:
    - `public.get_pending_user_connection_requests()` needs to project requester's profile details. **(RESOLVED - Already implemented in `20250602000001_create_user_connection_rpcs.sql`)**
    - `public.get_sent_user_connection_requests()` needs to project addressee's profile details. **(RESOLVED - Already implemented in `20250602000001_create_user_connection_rpcs.sql`)**
    - `public.get_pending_company_connection_requests()` could project requester company details. **(RESOLVED - Implemented in `20250612000001_update_company_connection_req_rpcs_with_details.sql`)**
    - `public.get_sent_company_connection_requests()` could project addressee company details. **(RESOLVED - Implemented in `20250612000001_update_company_connection_req_rpcs_with_details.sql`)**
- **Action**: Update company connection RPCs to join and return necessary details (e.g., name, avatar_url). (All listed items now resolved).
- **File(s) to create/modify**: Migration files for the respective company connection RPCs if not already done. (Completed).

### 1.3. Admin Checks in Flagging RPCs (Verification Needed)
- **Debt**: Ensure `public.admin_get_flag_statistics()`, `public.admin_get_post_flags()`, `public.admin_get_comment_flags()` have robust admin checks (e.g., `internal.ensure_admin()` or explicit `IF NOT internal.is_admin(auth.uid()) THEN ...`) in their *latest implemented versions*.
- **Action**: Verify the *active* migration files for these RPCs. If checks are missing or insufficient, add them.
- **Resolution**: **RESOLVED**. The migration file `supabase/migrations/20250525000000_create_admin_flag_rpc_functions.sql` correctly uses `PERFORM internal.ensure_admin();` for `public.admin_get_flag_statistics()`, `public.admin_get_post_flags()`, and `public.admin_get_comment_flags()`. The function `internal.ensure_admin()` is defined in `20250515500000_create_ensure_admin_function.sql` and correctly checks `internal.is_admin(auth.uid())`.
- **File(s) to create/modify**: None needed.

## 2. Important Enhancements & Refinements

### 2.1. Configurable Admin Email
- **Debt**: Hardcoded admin email (e.g., 'rmarshall@itmarshall.net') in multiple RPCs.
- **Action**:
    1. Plan and implement a method for configuring this. **(RESOLVED - `internal.app_config` table and `internal.get_app_config()` function created in `20250612000002_create_internal_app_config.sql`)**
    2. Update RPCs to use the configured value. **(RESOLVED - `public.admin_update_company_verification`, `public.admin_remove_post`, `public.admin_remove_comment`, `public.admin_warn_user`, `public.admin_ban_user` updated in `20250612000003_update_rpcs_to_use_app_config_admin_email.sql`)**
- **File(s) to create/modify**: `20250612000002_create_internal_app_config.sql`, `20250612000003_update_rpcs_to_use_app_config_admin_email.sql`.

### 2.2. Privacy/Visibility Confirmation for Network/Follow RPCs
- **Debt**:
    - `public.get_user_network(p_target_user_id UUID)`: Public visibility by default, needed user opt-out.
    - `public.get_followed_companies()` (when called for `p_user_id <> auth.uid()`): Public visibility by default, needed user opt-out.
- **Action**: Implement user-configurable privacy flags.
    - Add `is_network_public` and `are_followed_companies_public` to `public.profiles`. **(RESOLVED - `20250612000004_add_privacy_flags_to_profiles.sql`)**
    - Update `public.get_user_network` to respect `is_network_public`, allowing owner/admin override. **(RESOLVED - `20250612000005_update_get_user_network_with_privacy.sql`)**
    - Update `public.get_followed_companies` to respect `are_followed_companies_public`, allowing owner/admin override, and to return company details. **(RESOLVED - `20250612000006_update_get_followed_companies_with_privacy.sql`)**
- **File(s) to create/modify**: `20250612000004_add_privacy_flags_to_profiles.sql`, `20250612000005_update_get_user_network_with_privacy.sql`, `20250612000006_update_get_followed_companies_with_privacy.sql`.

### 2.3. `messages.updated_at` Column
- **Debt**: `public.messages` table lacks an `updated_at` column.
- **Action**: Add an `updated_at` column to `public.messages` and an auto-update trigger. **(RESOLVED - Implemented in `20250612000007_add_updated_at_to_messages.sql`)**
- **File(s) to create/modify**: `20250612000007_add_updated_at_to_messages.sql`.

### 2.4. Messaging Restrictions (`public.send_message`)
- **Debt**: `public.send_message` RPC needs to enforce messaging rules based on user/company status and connections, as per Platform Interaction Model.
- **Action**:
    1. Implement `internal.are_users_connected` for U2U messages. **(RESOLVED - `supabase/migrations/20250612000008_create_are_users_connected_function.sql`)**
    2. Update `public.send_message` to use this and other rules from Platform Interaction Model. **(PARTIALLY RESOLVED - `supabase/migrations/20250612000011_update_send_message_for_platform_interaction_model.sql` implements most rules.)**
- **Outstanding Issues & Refinements**:
    - **Company-to-Company (C2C) Verification**: The current `send_message` RPC allows C2C messages even if one/both companies are not verified, contrary to its comment (IS '...Company->Company (requires both to be verified)...').
    - **Action**: Update `public.send_message` to strictly enforce that both companies must be TIER1_VERIFIED or TIER2_FULLY_VERIFIED for C2C messaging.
    - **User-to-Company (U2C) Openness**: Currently broadly allowed. Review if `PlatformInteractionModel.md` suggests stricter rules (e.g., based on company verification or user trust level).
- **File(s) to create/modify**: New migration for `public.send_message` if C2C rule is tightened (e.g., `supabase/migrations/20250613000006_update_send_message_c2c_verification.sql`). Review of U2C rules against model.

### 2.5. `public.mark_messages_as_read` Security Context
- **Debt**: RPC uses `SECURITY DEFINER`. This bypasses the `messages` table's UPDATE RLS (`receiver_id = auth.uid() AND is_system_message = false`). If the RLS is the source of truth for this permission, the RPC should be `SECURITY INVOKER`.
- **Action**: Confirm intended behavior. If RLS should govern, change RPC to `SECURITY INVOKER`.
- **Resolution**: **RESOLVED**. 
    - The RLS UPDATE policy on `public.messages` ("Users can mark their received messages as read") was updated in `supabase/migrations/20250613000004_update_messages_rls_mark_as_read.sql` to have a corrected `WITH CHECK (auth.uid() = receiver_id AND is_system_message = FALSE)` clause, ensuring users can only update their own non-system messages.
    - The RPC `public.mark_messages_as_read` was changed to `SECURITY INVOKER` in `supabase/migrations/20250613000005_update_mark_messages_read_rpc_security.sql`, so it now operates under the RLS policy.
- **File(s) to create/modify**: `supabase/migrations/20250613000004_update_messages_rls_mark_as_read.sql`, `supabase/migrations/20250613000005_update_mark_messages_read_rpc_security.sql`.

### 2.6. System Notification Creation RLS
- **Debt**: RLS for `public.user_notifications` INSERT (`"System can create notifications"`) uses `internal.is_system_process()`, which may not be defined or robustly implemented.
- **Action**: Clarify and implement a secure way for system processes/triggers to create notifications. Options:
    - Define `internal.is_system_process()` (e.g., checks for a special system role).
    - Ensure all notification-creating contexts (triggers, specific RPCs) run as `SECURITY DEFINER` from trusted, admin-controlled code.
- **Resolution**: **LARGELY ADDRESSED**. 
    - No explicit INSERT RLS policy named `"System can create notifications"` or using `internal.is_system_process()` was found on `public.user_notifications`. 
    - Authenticated users without special privileges cannot directly insert into `public.user_notifications` due to RLS being enabled and lack of a general INSERT policy.
    - System-generated notifications (e.g., from admin actions) are created within `SECURITY DEFINER` RPCs (e.g., `public.admin_warn_user`, `public.admin_remove_post`). These RPCs correctly perform admin checks using `internal.is_admin()` or `internal.ensure_admin()` before inserting notifications.
    - This approach confines privileged notification creation to specific, auditable code paths, which is secure.
    - Future system notification mechanisms should continue this pattern or use carefully designed `SECURITY DEFINER` triggers/functions if RLS bypass is needed.
- **File(s) to create/modify**: None needed at this time. Documentation updated.

### 2.7. `profile_status_enum` Values for 'warned', 'banned'
- **Debt**: Admin RPCs set profile status to 'warned', 'banned_temporarily', 'banned_permanently'. Need to ensure these values exist in the `public.profile_status_enum`.
- **Action**: Check the definition of `public.profile_status_enum`. If missing, add these values via an `ALTER TYPE ... ADD VALUE` migration.
- **Resolution**: **RESOLVED**. The enum `public.profile_status_enum` (defined in `supabase/migrations/20250526000000_add_moderation_features.sql`) already includes 'active', 'warned', 'banned_temporarily', and 'banned_permanently'.
- **File(s) to create/modify**: None needed.

## 3. Systematic Reviews (Broader Initiatives)

### 3.1. Comprehensive Trigger Review
- **Debt**: Potential for incorrect logic, performance issues, or security vulnerabilities in existing triggers, especially `SECURITY DEFINER` triggers.
- **Action**: Perform a dedicated review of ALL database triggers. Document findings and create migrations for any necessary changes.
- **Status**: **IN PROGRESS / PARTIALLY ADDRESSED (Initial Review Complete)**
    - **Review Performed (2025-06-13)**:
        - **`updated_at` Triggers**: Multiple triggers using functions like `public.handle_updated_at()`, `internal.set_updated_at_on_messages()`, etc. All found to be standard, simple, and low risk. Minor redundancy in function definitions noted but not functionally problematic.
        - **`internal.validate_company_user_role_update`** (on `public.company_users`): Logic for preventing invalid owner demotions seems correct. `SECURITY DEFINER` usage acceptable for validation read. Low risk.
        - **`internal.assign_company_owner_role`** (on `public.companies`): Automatically assigns 'OWNER' role. `SECURITY DEFINER` necessary and appropriately used. Low risk.
        - **`internal.prevent_owner_update_restricted_company_fields`** (on `public.companies`): Prevents owners from updating `verification_status`, `admin_notes`. Logic sound, `SECURITY INVOKER` with `current_user` check for bypass is good. Low risk.
        - **`public.send_welcome_message_to_new_user`** (on `public.profiles`): `SECURITY DEFINER` appropriate.
            - **Issue Found**: Used hardcoded admin email.
            - **Resolution**: Updated in `supabase/migrations/20250613000007_update_welcome_message_trigger_fn.sql` to use `internal.get_app_config('admin_email')` and mark message as `is_system_message`.
        - **`public.create_quote_revision`** (on `public.quotes`): Standard versioning trigger. `SECURITY INVOKER`. Low risk.
        - **Trust Level Triggers** (various `internal.trigger_update_user_trust_level_for_*()` calling `internal.update_user_trust_level` which uses `internal.calculate_user_trust_score_points`):
            - Most complex set of triggers. `SECURITY DEFINER` used by individual trigger functions.
            - **Risk**: Medium to High. Medium due to `SECURITY DEFINER` on functions with complex cross-table reads. High from a performance/correctness perspective of `calculate_user_trust_score_points` if not optimized or if logic is flawed.
            - **Action Needed**: Requires thorough performance testing and validation of point calculation logic in `calculate_user_trust_score_points`. (Ongoing / Future Task).
- **File(s) to create/modify**: `supabase/migrations/20250613000007_update_welcome_message_trigger_fn.sql` (created and applied for welcome message fix).

### 3.2. Indexing Strategy Review & Implementation
- **Debt**: Missing or suboptimal indexes can lead to poor database performance.
- **Action**:
    1. Analyze common query patterns from RPCs, views, and anticipated frontend usage.
    2. Use `EXPLAIN ANALYZE` on representative queries.
    3. Define and implement an optimal indexing strategy (B-tree, GIN, GiST, BRIN as appropriate).
    4. Pay special attention to Foreign Keys that are frequently used in joins or WHERE clauses.
- **File(s) to create/modify**: New migration file(s) for creating/modifying indexes.

### 3.3. Comment Sorting by "Most Liked"
- **Debt**: Frontend `CommentList.tsx` mentions 'most_liked' sort for comments is not implemented.
- **Action**:
    1. Decide if this is a required feature.
    2. If yes:
        - Option A: Enhance `public.get_post_comments_threaded` RPC to accept a sort parameter (e.g., `p_sort_by TEXT DEFAULT 'path'`) and include logic to sort by likes (while preserving threading if possible, or as a top-level sort option).
        - Option B: Ensure frontend can fetch all necessary like data and perform client-side sorting (may be inefficient for many comments).
- **File(s) to create/modify**: Potentially migration for `public.get_post_comments_threaded` RPC.

## 4. Future Considerations (Track for Later)

### 4.1. Dedicated Profile RPCs
- **Debt**: Current profile access is direct table RLS. May need dedicated RPCs (`get_user_profile_details`, `update_user_profile`) for complex data consolidation, validation, or privacy.
- **Action**: Monitor complexity. Implement if direct RLS becomes insufficient.

### 4.2. `admin_actions_log` Table
- **Debt**: Several admin RPCs reference logging to an `admin_actions_log` table. Need to ensure this table is well-defined, reviewed, and consistently used.
- **Action**:
    1. If table doesn't exist, define and create it via migration (columns: action_type, admin_user_id, target_user_id, target_content_id, target_content_type, reason, timestamp, etc.).
    2. Review existing admin RPCs to ensure they log to this table correctly.
- **File(s) to create/modify**: Migration for `admin_actions_log` table; updates to admin RPCs.

### 4.3. Full Ban Enforcement Mechanisms
- **Debt**: `public.admin_ban_user` sets a profile status but doesn't yet implement deeper ban enforcement (e.g., revoking sessions, RLS checks against 'banned' status for most actions).
- **Action**: Plan and implement comprehensive ban enforcement. This is a larger feature involving RLS updates across many tables and potentially middleware/edge function logic.

---
*This list will be updated as items are addressed or new debt is identified.*
