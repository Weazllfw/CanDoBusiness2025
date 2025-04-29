-- Create notification system
create type public.notification_priority as enum (
  'low',
  'medium',
  'high',
  'urgent'
);

create type public.notification_channel as enum (
  'in_app',
  'email',
  'sms',
  'push'
);

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  notification_type text not null,
  channels notification_channel[] default array['in_app']::notification_channel[],
  enabled boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, notification_type)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  title text not null,
  content text not null,
  notification_type text not null,
  priority notification_priority default 'low',
  metadata jsonb default '{}'::jsonb,
  read_at timestamp with time zone,
  actioned_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create reporting system
create table public.report_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  query_template text not null,
  parameters jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.scheduled_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  template_id uuid not null references public.report_templates(id) on delete cascade,
  name text not null,
  parameters jsonb default '{}'::jsonb,
  schedule text not null, -- cron expression
  last_run_at timestamp with time zone,
  next_run_at timestamp with time zone,
  recipients jsonb default '[]'::jsonb,
  enabled boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.report_executions (
  id uuid primary key default gen_random_uuid(),
  scheduled_report_id uuid references public.scheduled_reports(id) on delete set null,
  company_id uuid not null references public.companies(id) on delete cascade,
  template_id uuid not null references public.report_templates(id) on delete cascade,
  parameters jsonb default '{}'::jsonb,
  status text not null check (status in ('pending', 'running', 'completed', 'failed')),
  result_url text,
  error_message text,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create marketplace analytics
create table public.market_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  parent_id uuid references public.market_categories(id) on delete set null,
  description text,
  icon_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.company_categories (
  company_id uuid not null references public.companies(id) on delete cascade,
  category_id uuid not null references public.market_categories(id) on delete cascade,
  is_primary boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (company_id, category_id)
);

create table public.market_trends (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.market_categories(id) on delete cascade,
  metric_name text not null,
  metric_value decimal(10,2) not null,
  period_start timestamp with time zone not null,
  period_end timestamp with time zone not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.company_ratings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  rated_by_company_id uuid not null references public.companies(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  review_text text,
  review_response text,
  response_at timestamp with time zone,
  status text not null check (status in ('pending', 'approved', 'rejected', 'reported')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(company_id, rated_by_company_id)
);

-- Create indexes
create index idx_notifications_user on public.notifications(user_id);
create index idx_notifications_company on public.notifications(company_id);
create index idx_notifications_unread on public.notifications(user_id) where read_at is null;
create index idx_notification_preferences_user on public.notification_preferences(user_id);
create index idx_scheduled_reports_company on public.scheduled_reports(company_id);
create index idx_scheduled_reports_template on public.scheduled_reports(template_id);
create index idx_report_executions_report on public.report_executions(scheduled_report_id);
create index idx_report_executions_company on public.report_executions(company_id);
create index idx_market_categories_parent on public.market_categories(parent_id);
create index idx_company_categories_company on public.company_categories(company_id);
create index idx_company_categories_category on public.company_categories(category_id);
create index idx_market_trends_category on public.market_trends(category_id);
create index idx_market_trends_period on public.market_trends(period_start, period_end);
create index idx_company_ratings_company on public.company_ratings(company_id);
create index idx_company_ratings_rated_by on public.company_ratings(rated_by_company_id);

-- Create analytics views
create view public.company_rating_stats as
select
  c.id as company_id,
  c.name as company_name,
  count(cr.id) as total_ratings,
  round(avg(cr.rating)::numeric, 2) as average_rating,
  count(*) filter (where cr.rating = 5) as five_star_count,
  count(*) filter (where cr.rating = 4) as four_star_count,
  count(*) filter (where cr.rating = 3) as three_star_count,
  count(*) filter (where cr.rating = 2) as two_star_count,
  count(*) filter (where cr.rating = 1) as one_star_count
from public.companies c
left join public.company_ratings cr on cr.company_id = c.id
where cr.status = 'approved'
group by c.id, c.name;

create view public.category_market_size as
select
  mc.id as category_id,
  mc.name as category_name,
  count(distinct cc.company_id) as total_companies,
  count(distinct ci.id) filter (
    where ci.created_at >= now() - interval '30 days'
  ) as monthly_interactions,
  count(distinct r.id) filter (
    where r.created_at >= now() - interval '30 days'
  ) as monthly_rfqs
from public.market_categories mc
left join public.company_categories cc on cc.category_id = mc.id
left join public.company_interactions ci on ci.company_id = cc.company_id
left join public.rfqs r on r.company_id = cc.company_id
group by mc.id, mc.name;

-- Enable RLS
alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;
alter table public.report_templates enable row level security;
alter table public.scheduled_reports enable row level security;
alter table public.report_executions enable row level security;
alter table public.market_categories enable row level security;
alter table public.company_categories enable row level security;
alter table public.market_trends enable row level security;
alter table public.company_ratings enable row level security;

-- Create RLS policies
create policy "Users can manage their notification preferences"
  on public.notification_preferences for all
  using (user_id = auth.uid());

create policy "Users can view their notifications"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "Companies can manage their scheduled reports"
  on public.scheduled_reports for all
  using (
    exists (
      select 1 from public.user_company_link
      where company_id = scheduled_reports.company_id
      and user_id = auth.uid()
      and role in ('admin', 'analyst')
    )
  );

create policy "Companies can view their report executions"
  on public.report_executions for select
  using (
    exists (
      select 1 from public.user_company_link
      where company_id = report_executions.company_id
      and user_id = auth.uid()
    )
  );

create policy "Anyone can view market categories"
  on public.market_categories for select
  using (true);

create policy "Anyone can view company categories"
  on public.company_categories for select
  using (true);

create policy "Anyone can view market trends"
  on public.market_trends for select
  using (true);

create policy "Anyone can view approved company ratings"
  on public.company_ratings for select
  using (status = 'approved');

create policy "Companies can manage their ratings responses"
  on public.company_ratings for update
  using (
    exists (
      select 1 from public.user_company_link
      where company_id = company_ratings.company_id
      and user_id = auth.uid()
      and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_company_link
      where company_id = company_ratings.company_id
      and user_id = auth.uid()
      and role = 'admin'
    )
  );

-- Add updated_at triggers
create trigger handle_notification_preferences_updated_at
  before update on public.notification_preferences
  for each row
  execute function public.handle_updated_at();

create trigger handle_scheduled_reports_updated_at
  before update on public.scheduled_reports
  for each row
  execute function public.handle_updated_at();

create trigger handle_company_ratings_updated_at
  before update on public.company_ratings
  for each row
  execute function public.handle_updated_at();

-- Insert initial market categories
insert into public.market_categories (name, description) values
('Manufacturing', 'Companies involved in the production of goods'),
('Distribution', 'Companies involved in the distribution and logistics of goods'),
('Professional Services', 'Companies providing professional and consulting services'),
('Technology', 'Companies providing technology solutions and services'),
('Construction', 'Companies involved in construction and infrastructure'),
('Healthcare', 'Companies in the healthcare and medical industry'),
('Retail', 'Companies involved in retail and consumer goods'),
('Energy', 'Companies in the energy and utilities sector');

-- Insert report templates
insert into public.report_templates (name, description, query_template, parameters) values
('Monthly Activity Summary', 'Summary of company activities and interactions', 
'SELECT * FROM public.company_interaction_metrics WHERE company_id = :company_id AND month = :month',
'{"company_id": "uuid", "month": "timestamp"}'::jsonb),

('RFQ Analysis', 'Analysis of RFQ patterns and response rates',
'SELECT * FROM public.rfqs WHERE company_id = :company_id AND created_at BETWEEN :start_date AND :end_date',
'{"company_id": "uuid", "start_date": "timestamp", "end_date": "timestamp"}'::jsonb),

('Market Category Insights', 'Analysis of market category performance',
'SELECT * FROM public.category_market_size WHERE category_id = :category_id',
'{"category_id": "uuid"}'::jsonb); 