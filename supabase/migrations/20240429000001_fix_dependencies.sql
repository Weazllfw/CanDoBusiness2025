-- First, disable RLS to avoid policy conflicts
alter table if exists public.user_company_link disable row level security;

-- Drop all policies that might reference the table
do $$ 
declare
  pol record;
begin
  for pol in (
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
  ) loop
    execute format('drop policy if exists %I on %I.%I', 
      pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end $$;

-- Drop all foreign key constraints that reference the table
do $$ 
declare
  r record;
begin
  for r in (
    select tc.table_schema, tc.constraint_name, tc.table_name
    from information_schema.table_constraints tc
    join information_schema.constraint_column_usage ccu 
    on tc.constraint_name = ccu.constraint_name
    where tc.constraint_type = 'FOREIGN KEY'
    and (ccu.table_name = 'user_company_link' 
    or tc.table_name = 'user_company_link')
  ) loop
    execute format('alter table %I.%I drop constraint %I', 
      r.table_schema, r.table_name, r.constraint_name);
  end loop;
end $$;

-- Drop indexes
drop index if exists idx_user_company_user;
drop index if exists idx_user_company_company;

-- Now we can safely drop the table
drop table if exists public.user_company_link;

-- Recreate policies using the new user_company_roles table
create policy "Users can view companies they belong to" 
  on public.companies for select 
  using (
    exists (
      select 1 from public.user_company_roles
      where company_id = id 
      and user_id = auth.uid()
      and status = 'ACTIVE'
    )
  );

create policy "Company admins can update company details" 
  on public.companies for update 
  using (
    exists (
      select 1 from public.user_company_roles
      where company_id = id 
      and user_id = auth.uid() 
      and role in ('OWNER', 'ADMIN')
      and status = 'ACTIVE'
    )
  ); 