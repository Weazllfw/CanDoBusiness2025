-- First disable RLS
alter table if exists public.user_company_link disable row level security;

-- Drop all dependent policies
drop policy if exists "Users can view companies they belong to" on public.companies;
drop policy if exists "Company admins can update company details" on public.companies;
drop policy if exists "Companies can view their own verifications" on public.verifications;
drop policy if exists "Companies can submit verifications" on public.verifications;
drop policy if exists "Companies can view their own subscriptions" on public.company_subscriptions;
drop policy if exists "Companies can view their own analytics" on public.analytics_events;
drop policy if exists "Companies can view their own billing history" on public.billing_history;
drop policy if exists "Companies can manage their referral codes" on public.referral_codes;
drop policy if exists "Companies can view their referral claims" on public.referral_claims;
drop policy if exists "Companies can view their interactions" on public.company_interactions;
drop policy if exists "Companies can manage their scheduled reports" on public.scheduled_reports;
drop policy if exists "Companies can view their report executions" on public.report_executions;
drop policy if exists "Companies can manage their ratings responses" on public.company_ratings;

-- Rename the existing table instead of dropping it
alter table if exists public.user_company_link rename to user_company_link_old;

-- Create enum for company roles
create type public.company_role as enum (
  'OWNER',
  'ADMIN',
  'RFQ_MANAGER',
  'SOCIAL_MANAGER',
  'MEMBER'
);

-- Create enum for role status
create type public.role_status as enum (
  'PENDING',
  'ACTIVE',
  'SUSPENDED',
  'REMOVED'
);

-- Enhance companies table with additional fields
alter table public.companies
  add column if not exists legal_name text,
  add column if not exists trading_name text,
  add column if not exists business_number text unique,
  add column if not exists founded_date date,
  add column if not exists status text check (status in ('ACTIVE', 'SUSPENDED', 'ARCHIVED')) default 'ACTIVE',
  add column if not exists verification_status text check (verification_status in ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED')) default 'UNVERIFIED';

-- Create enhanced user_company_roles table
create table public.user_company_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  role public.company_role not null default 'MEMBER',
  status public.role_status not null default 'PENDING',
  invited_by uuid references public.users(id),
  joined_at timestamp with time zone default timezone('utc'::text, now()),
  custom_permissions jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, company_id)
);

-- Migrate data from old table if it exists
insert into public.user_company_roles (user_id, company_id, role, status, created_at, updated_at)
select 
  user_id,
  company_id,
  case 
    when role = 'admin' then 'ADMIN'::public.company_role
    else 'MEMBER'::public.company_role
  end as role,
  'ACTIVE'::public.role_status as status,
  created_at,
  created_at as updated_at
from public.user_company_link_old;

-- Drop the old table
drop table if exists public.user_company_link_old;

-- Create indexes
create index idx_user_company_roles_user on public.user_company_roles (user_id);
create index idx_user_company_roles_company on public.user_company_roles (company_id);
create index idx_user_company_roles_status on public.user_company_roles (status);
create index idx_companies_business_number on public.companies (business_number);

-- Enable RLS
alter table public.user_company_roles enable row level security;

-- Create policies for user_company_roles
create policy "Users can view their own company roles"
  on public.user_company_roles for select
  using (auth.uid() = user_id);

create policy "Company owners and admins can view all company roles"
  on public.user_company_roles for select
  using (
    exists (
      select 1 from public.user_company_roles
      where company_id = company_id 
      and user_id = auth.uid() 
      and role in ('OWNER', 'ADMIN')
      and status = 'ACTIVE'
    )
  );

create policy "Company owners can manage all roles"
  on public.user_company_roles for all
  using (
    exists (
      select 1 from public.user_company_roles
      where company_id = company_id 
      and user_id = auth.uid() 
      and role = 'OWNER'
      and status = 'ACTIVE'
    )
  );

create policy "Company admins can manage non-owner roles"
  on public.user_company_roles for all
  using (
    exists (
      select 1 from public.user_company_roles
      where company_id = user_company_roles.company_id
      and user_id = auth.uid()
      and role = 'ADMIN'
      and status = 'ACTIVE'
    )
  )
  with check (
    exists (
      select 1 from public.user_company_roles
      where company_id = user_company_roles.company_id
      and user_id = auth.uid()
      and role = 'ADMIN'
      and status = 'ACTIVE'
    )
    and role != 'OWNER'
  );

-- Update company policies
create policy "Company owners and admins can update company details"
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

create policy "Social managers can update specific company fields"
  on public.companies for update
  using (
    exists (
      select 1 from public.user_company_roles
      where company_id = id
      and user_id = auth.uid()
      and role = 'SOCIAL_MANAGER'
      and status = 'ACTIVE'
    )
  )
  with check (
    -- Social managers can only update social media related fields
    legal_name = companies.legal_name and
    business_number = companies.business_number and
    founded_date = companies.founded_date
  );

-- Add trigger for updated_at
create trigger handle_user_company_roles_updated_at
  before update on public.user_company_roles
  for each row
  execute function public.handle_updated_at();

-- Create function to ensure company has at least one owner
create or replace function public.ensure_company_owner()
returns trigger as $$
begin
  if old.role = 'OWNER' and old.status = 'ACTIVE' then
    if not exists (
      select 1 from public.user_company_roles
      where company_id = old.company_id
      and role = 'OWNER'
      and status = 'ACTIVE'
      and id != old.id
    ) then
      raise exception 'Cannot remove or change the last owner of a company';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger ensure_company_owner
  before update or delete on public.user_company_roles
  for each row
  execute function public.ensure_company_owner(); 