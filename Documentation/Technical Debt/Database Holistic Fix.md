# Database and Networking Code Holistic Fix Plan

This document outlines the plan to address current issues, clean up the database schema and related RPCs, and improve the overall stability and maintainability of the networking and connection features.

---

## Phase 1: Stabilize Critical Path & Verify Core Data Integrity (Immediate Focus)

This phase is about fixing the most jarring current issues and ensuring our foundational data is correct.

### 1. Investigate and Fix "Companies You May Know (CYMK) Disappeared"

*   **Action 1a: Clarify `public.users` Schema.**
    *   **Task**: Determine if `public.users` is a table or a view. Document its schema, specifically the `id` column and its relation to `auth.users.id` or `public.profiles.id`.
    *   **Responsibility**: User to provide this information.
    *   **Why**: Top suspect for CYMK issue. If `user_company_follows.user_id` uses a different ID system, CYMK suggestions will break.
    *   **Status**: COMPLETE. 
        *   No `public.users` table exists.
        *   `auth.users.id` is the primary auth ID (UUID).
        *   `public.profiles.id` is a UUID, is the PK for `profiles`, and has an FK `profiles_id_fkey` to `auth.users(id) ON DELETE CASCADE`.
        *   This confirms `profiles.id` is equivalent to `auth.users.id`.

*   **Action 1b: Verify Company Verification Status for CYMK.**
    *   **Task**: Check company data to ensure there are companies marked as `TIER1_VERIFIED` that *should* be viable candidates for suggestions.
    *   **Responsibility**: User to check data.
    *   **Why**: The `get_cymk_suggestions` RPC explicitly filters for this.
    *   **Status**: COMPLETE. User confirmed at least one reasonable `TIER1_VERIFIED` company exists.

*   **Action 1c (If 1a/1b don't solve it): Targeted Debugging of `get_cymk_suggestions`.**
    *   **Task**: 
        *   First, verify schema (columns and FKs) of `user_company_follows`. (DONE - Schema is sound)
        *   Then, manually run parts of the `get_cymk_suggestions` SQL query directly in the Supabase SQL editor (CTEs step-by-step) to see where data is being lost. (DONE - RPC logic is sound; issue is lack of qualifying data after DB reset. Both primary and fallback suggestion sources are empty for the test user due to current data state.)
    *   **Responsibility**: AI/User collaboration.
    *   **Why**: To pinpoint if the logic itself is flawed beyond ID or verification status, or if `user_company_follows` structure is unexpected.
    *   **Status**: COMPLETE (Data-related, not a bug in RPC logic per se)

### 2. Investigate and Fix "Infinite Refreshing on Company Page"

*   **Action 2a: Frontend Debugging.**
    *   **Task**: Use browser developer tools (Network and Console tabs) when navigating to a company page that causes the infinite refresh.
        *   Identify:
            *   Which RPC calls are repeating?
            *   Are there any JavaScript errors?
            *   What state variables in `cando-frontend/src/app/company/[id]/page.tsx` might be changing and triggering re-renders/fetches?
    *   **Responsibility**: User to perform debugging.
    *   **Why**: To understand the loop's origin.
    *   **Status**: PENDING USER INPUT

*   **Action 2b: Review `is_company_admin` Calls.**
    *   **Task**: Review calls to `check_if_user_is_company_admin` on the company page and `connections/page.tsx`. Ensure parameters are correct and responses handled robustly.
    *   **Responsibility**: AI/User collaboration.
    *   **Why**: This was a recent sensitive change; errors here could contribute to re-render loops.
    *   **Status**: PENDING (can be reviewed based on current code, but full impact seen after 2a)

---

## Phase 2: Code & Schema Cleanup and Refinement (Medium Term)

Once critical issues are resolved, this phase will focus on improving clarity and robustness.

### 3. Consolidate and Deprecate Old Connection Logic

*   **Action 3a: Identify and Remove Superseded Connection Tables/RPCs.**
    *   **Task**: Confirm `20250520...` versions of connection tables and the `get_company_connections` RPC (`20250603...`) are unused. Create new migration(s) to `DROP` these, documenting the reasons.
    *   **Responsibility**: AI to draft migration, User to confirm no frontend usage.
    *   **Why**: Reduces confusion, simplifies schema, removes dead code.
    *   **Status**: PENDING

*   **Action 3b: Standardize User ID References.**
    *   **Task**: If Action 1a reveals inconsistencies in `user_id` references (e.g., `user_company_follows.user_id`), create a migration to fix this (e.g., alter FK, migrate data).
    *   **Responsibility**: AI to draft migration, User to confirm approach.
    *   **Why**: Ensures data integrity and reliable joins.
    *   **Status**: BLOCKED (by 1a)

### 4. Refine RPCs and RLS Policies

*   **Action 4a: Review `SECURITY DEFINER` RPCs.**
    *   **Task**: Scrutinize all `SECURITY DEFINER` functions. Ensure necessity and correct `SET search_path`. Consider changing to `SECURITY INVOKER` where possible.
    *   **Responsibility**: AI/User collaboration for review.
    *   **Why**: Security best practice; minimize `SECURITY DEFINER` usage.
    *   **Status**: PENDING

*   **Action 4b: Complete TODOs in RLS.**
    *   **Task**: Implement RLS policies for `BLOCKED` status in `user_connections` and `company_connections` tables.
    *   **Responsibility**: AI to draft policies.
    *   **Why**: Completeness and proper handling of all defined states.
    *   **Status**: PENDING

*   **Action 4c: Re-evaluate `internal.is_company_admin` vs. `public.check_if_user_is_company_admin`.**
    *   **Task**: Test if direct calls to `supabase.rpc('internal.is_company_admin', ...)` work reliably from the frontend after `config.toml` changes and Supabase restart. If so, consider reverting to direct internal calls and removing the public wrapper.
    *   **Responsibility**: User to test, AI to implement change if decided.
    *   **Why**: Simplification if possible. Wrapper is fine if direct calls remain problematic.
    *   **Status**: PENDING

---

## Phase 3: Documentation and Future-Proofing (Ongoing)

This phase focuses on long-term maintainability.

### 5. Create/Update Technical Documentation

*   **Action 5a: Document Workarounds and Technical Debt.**
    *   **Task**: Maintain `Documentation/Technical Debt/Database Holistic Fix.md` (this file). Add a section for the `is_company_admin` wrapper if kept, or other workarounds encountered.
    *   **Responsibility**: AI/User collaboration.
    *   **Why**: Tracks technical debt and context for decisions.
    *   **Status**: IN PROGRESS (this document)

*   **Action 5b: Document Core Data Models and RPCs.**
    *   **Task**: Update `Documentation/NetworkingSystem.md` and other relevant docs to accurately reflect *current* tables and RPCs. Clearly mark deprecated items. Document user ID conventions.
    *   **Responsibility**: AI/User collaboration.
    *   **Why**: Essential for maintainability and onboarding.
    *   **Status**: PENDING

### 6. Establish a Clearer Migration Strategy

*   **Action 6a: Review and Refine Migration Naming and Descriptions.**
    *   **Task**: Ensure new migrations clearly state their purpose and impact.
    *   **Responsibility**: AI/User collaboration.
    *   **Why**: Clarity in database evolution.
    *   **Status**: ONGOING

*   **Action 6b: Test Migrations Thoroughly Locally.**
    *   **Task**: Before applying to staging/production, reset local DB and run all migrations from scratch.
    *   **Responsibility**: User/AI.
    *   **Why**: Prevents deployment issues.
    *   **Status**: ONGOING (as a best practice)

---

## Next Steps (Immediate)

1.  **User to provide schema information for `public.users` (Action 1a).**
2.  **User to begin frontend debugging for the infinite refresh issue (Action 2a).**
