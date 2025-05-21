# Workarounds and Technical Debt Log

This document tracks temporary workarounds implemented in the system and areas of technical debt that should be addressed in the future.

---

## 1. RPC Call to `internal.is_company_admin` via Public Wrapper

*   **Date Implemented:** 2025-06-11 (approx)
*   **Affected Components:**
    *   `cando-frontend/src/app/company/[id]/page.tsx`
    *   `cando-frontend/src/app/company/[id]/connections/page.tsx`
    *   SQL function: `internal.is_company_admin(UUID, UUID)`
    *   SQL wrapper function: `public.check_if_user_is_company_admin(UUID, UUID)` (defined in `supabase/migrations/20250611000000_create_public_check_if_user_is_company_admin_rpc.sql`)
*   **Issue Description:**
    When attempting to call the SQL function `internal.is_company_admin` directly from the frontend using `supabase.rpc('internal.is_company_admin', {...})`, PostgREST (in the local Supabase development environment) failed to correctly resolve the schema. Instead of recognizing `internal` as the schema and `is_company_admin` as the function, it appeared to search for a literal function named `"internal.is_company_admin"` within the `public` schema, resulting in a "function not found" error (`PGRST202`).
*   **Troubleshooting Steps Attempted (without success for direct call):
    *   Ensuring `internal.is_company_admin` was correctly defined in the database (confirmed via `psql`).
    *   Adding `"internal"` to `[api].schemas` in `supabase/config.toml`.
    *   Adding `"internal"` to `[api].extra_search_path` in `supabase/config.toml`.
    *   Restarting Supabase services after each configuration change.
*   **Workaround Implemented:**
    A public wrapper function, `public.check_if_user_is_company_admin(p_user_id_to_check UUID, p_target_company_id UUID)`, was created. This public function simply calls `internal.is_company_admin` internally. The frontend code was updated to call this public wrapper instead.
    This approach works because calls to public functions are resolved correctly, and the `SET search_path = public, internal` within the wrapper function allows it to find and execute the `internal.is_company_admin` function.
*   **Potential Future Fix / Investigation:**
    *   Investigate why PostgREST in the local development environment (specific Supabase CLI version/Docker image) does not correctly parse `schema.function_name` for RPC calls to non-public schemas, even when the schema is listed in `[api].schemas`.
    *   Check if newer versions of the Supabase CLI or underlying Docker images for PostgREST resolve this parsing behavior.
    *   If the root cause in PostgREST's local behavior is identified and fixed, the public wrapper could be removed, and direct calls to `internal.is_company_admin` could be reinstated for cleaner architecture.

--- 