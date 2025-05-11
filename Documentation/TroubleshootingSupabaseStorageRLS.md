## Common Supabase Troubleshooting

### RLS Policy Errors for Storage Uploads ("new row violates RLS" or "invalid input syntax for type uuid")

**Symptoms:**

*   Frontend error during file upload: "new row violates row-level security policy".
*   Frontend error during file upload: "Storage Error: insert into \"objects\" (...) - invalid input syntax for type uuid: '<some_string_value>'" (where `<some_string_value>` is clearly not a UUID).
*   `supabase db reset` may appear to complete successfully, or may have shown errors related to policy creation in the past.

**Problem:**

The Row Level Security (RLS) policy for `INSERT` operations on the `storage.objects` table for the specific bucket is likely incorrect. A common mistake is referencing a name column from a related table (e.g., `public.companies.name`) instead of the `storage.objects.name` (the file path itself) when trying to extract an ID for ownership checks.

**Example of Incorrect Policy Logic (Conceptual):**

```sql
-- INCORRECT: Tries to parse a company's actual name as if it were a path segment containing a UUID
auth.uid() = (
  SELECT owner_id FROM public.companies
  WHERE id = ((string_to_array(public.companies.name, '/'))[1])::uuid -- Wrong 'name'
)
```

**Example of Correct Policy Logic:**

The RLS policy needs to parse the `name` column from the `storage.objects` table (which represents the full path of the file being uploaded) to extract the relevant ID (e.g., `company_id`) that forms part of the path.

```sql
-- CORRECT: Parses storage.objects.name (aliased as 'name' in RLS policy)
-- Assumes file path is like: {company_id}/{filename}
CREATE POLICY "Company owners can upload to their folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'your-target-bucket' AND
  auth.uid() = (
    SELECT c.owner_id
    FROM public.companies c
    WHERE c.id = ((string_to_array(name, '/'))[1])::uuid -- 'name' here is storage.objects.name
  )
);
```
*Remember: In the context of an RLS policy on `storage.objects`, `name` implicitly refers to `storage.objects.name`.* 

**Debugging & Solution Steps:**

1.  **Identify the Correct Migration File:** Locate the migration file responsible for setting up the RLS policies for the problematic storage bucket (e.g., `supabase/migrations/YYYYMMDDHHMMSS_setup_bucket_storage.sql`).
2.  **Verify the Policy Definition:**
    *   Ensure the `WITH CHECK` condition for the `INSERT` policy correctly uses `string_to_array(name, '/')` (or `string_to_array(storage.objects.name, '/')`) to parse the file path and extract the ID.
    *   Confirm it compares `auth.uid()` with the `owner_id` fetched from your related table (e.g., `public.companies`) based on this extracted ID.
3.  **Ensure Idempotency (DROP POLICY):** It's good practice for the migration file to explicitly `DROP POLICY IF EXISTS ... ON storage.objects;` before the `CREATE POLICY` statement. This ensures any manually altered or outdated versions of the policy in the database are removed.
4.  **Run `supabase db reset`:** This command re-applies all migrations. Monitor its output carefully for any errors, especially those related to the policy in question.
5.  **Verify in Supabase Studio:** After a successful `db reset`, go to the Supabase Studio (Storage -> Policies), select the bucket, and inspect the applied `INSERT` policy. Its definition should now exactly match the logic in your migration file.
6.  **Test Frontend Upload:** Re-test the file upload from your application.

**Key Takeaway:**

When RLS for storage uploads depends on path segments (like an `entity_id` in the path), the policy *must* parse `storage.objects.name` to extract that segment. Using a name field from another table for this path parsing will lead to errors. Always ensure your migration files are the source of truth and that `supabase db reset` applies them correctly. 