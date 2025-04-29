-- Create subscription tiers enum
create type public.subscription_tier as enum (
  'free',
  'basic',
  'premium',
  'enterprise'
);

-- Create subscription features table
create table public.subscription_features (
  id uuid primary key default gen_random_uuid(),
  tier subscription_tier not null,
  feature text not null,
  limit_value int,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(tier, feature)
);

-- Create company subscriptions table
create table public.company_subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  tier subscription_tier not null default 'free',
  starts_at timestamp with time zone default timezone('utc'::text, now()) not null,
  ends_at timestamp with time zone,
  auto_renew boolean default false,
  payment_method_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  constraint current_subscription unique (company_id, tier)
);

-- Create analytics events table
create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  user_id uuid references public.users(id) on delete set null,
  event_type text not null,
  properties jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create saved searches table
create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  notify boolean default false,
  last_notified_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create company analytics views
create view public.company_monthly_stats as
select
  c.id as company_id,
  c.name as company_name,
  date_trunc('month', e.created_at) as month,
  count(*) filter (where e.event_type = 'profile_view') as profile_views,
  count(*) filter (where e.event_type = 'rfq_received') as rfqs_received,
  count(*) filter (where e.event_type = 'message_received') as messages_received
from public.companies c
left join public.analytics_events e on e.company_id = c.id
group by c.id, c.name, date_trunc('month', e.created_at);

-- Create indexes
create index idx_company_subscriptions_company on public.company_subscriptions(company_id);
create index idx_analytics_events_company on public.analytics_events(company_id);
create index idx_analytics_events_user on public.analytics_events(user_id);
create index idx_analytics_events_type on public.analytics_events(event_type);
create index idx_analytics_events_created_at on public.analytics_events(created_at);
create index idx_saved_searches_user on public.saved_searches(user_id);

-- Enable RLS
alter table public.subscription_features enable row level security;
alter table public.company_subscriptions enable row level security;
alter table public.analytics_events enable row level security;
alter table public.saved_searches enable row level security;

-- Create RLS policies
create policy "Anyone can view subscription features"
  on public.subscription_features for select
  using (true);

create policy "Companies can view their own subscriptions"
  on public.company_subscriptions for select
  using (
    exists (
      select 1 from public.user_company_link
      where company_id = company_subscriptions.company_id
      and user_id = auth.uid()
    )
  );

create policy "Companies can view their own analytics"
  on public.analytics_events for select
  using (
    company_id in (
      select company_id from public.user_company_link
      where user_id = auth.uid()
    )
  );

create policy "Users can manage their saved searches"
  on public.saved_searches for all
  using (auth.uid() = user_id);

-- Add updated_at triggers
create trigger handle_company_subscriptions_updated_at
  before update on public.company_subscriptions
  for each row
  execute function public.handle_updated_at();

create trigger handle_saved_searches_updated_at
  before update on public.saved_searches
  for each row
  execute function public.handle_updated_at();

-- Insert subscription features
insert into public.subscription_features (tier, feature, limit_value) values
('free', 'rfq_monthly', 5),
('free', 'saved_searches', 2),
('free', 'message_threads', 10),
('basic', 'rfq_monthly', 20),
('basic', 'saved_searches', 10),
('basic', 'message_threads', 50),
('premium', 'rfq_monthly', 100),
('premium', 'saved_searches', -1),
('premium', 'message_threads', -1),
('enterprise', 'rfq_monthly', -1),
('enterprise', 'saved_searches', -1),
('enterprise', 'message_threads', -1); 