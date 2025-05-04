-- Enable required extensions
create extension if not exists pgcrypto;

-- Create base tables
create table if not exists public.users (
  id uuid primary key references auth.users(id),
  email text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.users enable row level security;

-- Create policies
create policy "Users can view their own data"
  on public.users for select
  using (auth.uid() = id);

-- Grant permissions
grant usage on schema public to authenticated;
grant all on public.users to authenticated; 