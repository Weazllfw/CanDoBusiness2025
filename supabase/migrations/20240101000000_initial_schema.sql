-- Create extensions
create extension if not exists "uuid-ossp";

-- Create users table with enhanced fields
create table public.users (
  id uuid references auth.users on delete cascade not null primary key,
  email text unique not null,
  full_name text,
  role text check (role in ('buyer', 'supplier', 'service')) default 'buyer',
  onboarding_complete boolean default false,
  subscription_tier text default 'free',
  public_email text,
  phone_number text,
  profile_photo_url text,
  avatar_url text,
  company_name text,
  company_role text,
  bio text,
  website text,
  location text,
  messaging_preference text check (messaging_preference in ('all', 'connections', 'none')) default 'all',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create companies table
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  display_name text,
  bio text,
  location text,
  website text,
  logo_url text,
  verified boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create user_company_link table
create table public.user_company_link (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  role text not null check (role in ('admin', 'staff')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, company_id)
);

-- Create indexes
create index idx_user_company_user on public.user_company_link (user_id);
create index idx_user_company_company on public.user_company_link (company_id);
create index idx_users_messaging_pref on public.users(messaging_preference);

-- Enable RLS
alter table public.users enable row level security;
alter table public.companies enable row level security;
alter table public.user_company_link enable row level security;

-- Create users policies
create policy "Users can view their own profile" 
  on public.users for select 
  using (auth.uid() = id);

create policy "Users can update their own profile" 
  on public.users for update 
  using (auth.uid() = id);

create policy "Users can view companies they belong to" 
  on public.companies for select 
  using (
    exists (
      select 1 from public.user_company_link
      where company_id = id and user_id = auth.uid()
    )
  );

create policy "Company admins can update company details" 
  on public.companies for update 
  using (
    exists (
      select 1 from public.user_company_link
      where company_id = id and user_id = auth.uid() and role = 'admin'
    )
  );

-- Create trigger for updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_users_updated_at
  before update on public.users
  for each row
  execute function public.handle_updated_at();

create trigger handle_companies_updated_at
  before update on public.companies
  for each row
  execute function public.handle_updated_at(); 