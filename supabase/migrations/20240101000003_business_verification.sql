-- Create verification types enum
create type public.verification_type as enum (
  'business_registration',
  'tax_id',
  'chamber_of_commerce',
  'industry_certification',
  'government_id'
);

-- Create verification status enum
create type public.verification_status as enum (
  'pending',
  'approved',
  'rejected'
);

-- Create verifications table
create table public.verifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  type verification_type not null,
  document_url text,
  status verification_status not null default 'pending',
  reviewer_notes text,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add verification-related fields to companies
alter table public.companies
add column verification_level int default 0,
add column verification_date timestamp with time zone,
add column business_registration_number text,
add column tax_id text,
add column year_founded int,
add column employee_count_range text check (employee_count_range in (
  '1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'
));

-- Create company badges table
create table public.company_badges (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  badge_type text not null check (badge_type in (
    'verified_business',
    'top_supplier',
    'fast_responder',
    'premium_member',
    'trusted_partner',
    'canadian_owned',
    'sustainability_leader'
  )),
  issued_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  unique(company_id, badge_type)
);

-- Create indexes
create index idx_verifications_company on public.verifications(company_id);
create index idx_verifications_status on public.verifications(status);
create index idx_company_badges_company on public.company_badges(company_id);
create index idx_companies_verification_level on public.companies(verification_level);

-- Enable RLS
alter table public.verifications enable row level security;
alter table public.company_badges enable row level security;

-- Create RLS policies
create policy "Companies can view their own verifications"
  on public.verifications for select
  using (
    exists (
      select 1 from public.user_company_link
      where company_id = verifications.company_id
      and user_id = auth.uid()
    )
  );

create policy "Companies can submit verifications"
  on public.verifications for insert
  with check (
    exists (
      select 1 from public.user_company_link
      where company_id = verifications.company_id
      and user_id = auth.uid()
      and role = 'admin'
    )
  );

create policy "Anyone can view company badges"
  on public.company_badges for select
  using (true);

-- Add updated_at trigger
create trigger handle_verifications_updated_at
  before update on public.verifications
  for each row
  execute function public.handle_updated_at(); 