-- Create tags table
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('industry', 'capability', 'region')),
  value text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (type, value)
);

-- Create user_tags table
create table public.user_tags (
  user_id uuid not null references public.users(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, tag_id)
);

-- Create RFQs table
create table public.rfqs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  status text default 'open' check (status in ('open', 'closed', 'draft')),
  user_id uuid not null references public.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create RFQ tags table
create table public.rfq_tags (
  rfq_id uuid not null references public.rfqs(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (rfq_id, tag_id)
);

-- Create indexes
create index idx_tags_type on public.tags(type);
create index idx_user_tags_user on public.user_tags(user_id);
create index idx_user_tags_tag on public.user_tags(tag_id);
create index idx_rfqs_user on public.rfqs(user_id);
create index idx_rfqs_company on public.rfqs(company_id);
create index idx_rfq_tags_tag on public.rfq_tags(tag_id);

-- Enable RLS
alter table public.tags enable row level security;
alter table public.user_tags enable row level security;
alter table public.rfqs enable row level security;
alter table public.rfq_tags enable row level security;

-- Create RLS policies
create policy "Anyone can view tags"
  on public.tags for select
  using (true);

create policy "Users can view their own tags"
  on public.user_tags for select
  using (auth.uid() = user_id);

create policy "Users can manage their own tags"
  on public.user_tags for all
  using (auth.uid() = user_id);

create policy "Users can view all RFQs"
  on public.rfqs for select
  using (true);

create policy "Users can manage their own RFQs"
  on public.rfqs for all
  using (auth.uid() = user_id);

create policy "Users can view RFQ tags"
  on public.rfq_tags for select
  using (true);

create policy "RFQ owners can manage RFQ tags"
  on public.rfq_tags for all
  using (
    exists (
      select 1 from public.rfqs
      where id = rfq_id and user_id = auth.uid()
    )
  );

-- Add updated_at trigger to RFQs
create trigger handle_rfqs_updated_at
  before update on public.rfqs
  for each row
  execute function public.handle_updated_at(); 