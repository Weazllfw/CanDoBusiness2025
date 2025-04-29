# Database Schema Documentation

## Core Tables

### Users and Companies

```sql
-- Users table (managed by Supabase Auth)
create table public.users (
  id uuid primary key references auth.users,
  email text,
  full_name text,
  avatar_url text,
  ...
);

-- Companies table
create table public.companies (
  id uuid primary key,
  name text,
  description text,
  verification_level int,
  business_registration_number text,
  tax_id text,
  year_founded int,
  employee_count_range text,
  ...
);

-- User-Company relationship
create table public.user_company_link (
  user_id uuid references users,
  company_id uuid references companies,
  role text,
  primary key (user_id, company_id)
);
```

## Business Verification System

### Verification Tables

```sql
-- Verification types and status
create type public.verification_type as enum (
  'business_registration',
  'tax_id',
  'chamber_of_commerce',
  'industry_certification',
  'government_id'
);

create type public.verification_status as enum (
  'pending',
  'approved',
  'rejected'
);

-- Verifications table
create table public.verifications (
  id uuid primary key,
  company_id uuid references companies,
  type verification_type,
  document_url text,
  status verification_status,
  reviewer_notes text,
  ...
);

-- Company badges
create table public.company_badges (
  id uuid primary key,
  company_id uuid references companies,
  badge_type text,
  issued_at timestamp,
  expires_at timestamp,
  ...
);
```

## Subscription and Billing

### Subscription Management

```sql
-- Subscription tiers
create type public.subscription_tier as enum (
  'free',
  'basic',
  'premium',
  'enterprise'
);

-- Subscription features
create table public.subscription_features (
  id uuid primary key,
  tier subscription_tier,
  feature text,
  limit_value int,
  ...
);

-- Company subscriptions
create table public.company_subscriptions (
  id uuid primary key,
  company_id uuid references companies,
  tier subscription_tier,
  starts_at timestamp,
  ends_at timestamp,
  auto_renew boolean,
  ...
);

-- Billing history
create table public.billing_history (
  id uuid primary key,
  company_id uuid references companies,
  subscription_id uuid references company_subscriptions,
  amount decimal(10,2),
  status text,
  ...
);
```

## Analytics and Reporting

### Analytics Tables

```sql
-- Company interactions
create table public.company_interactions (
  id uuid primary key,
  company_id uuid references companies,
  interacted_with_company_id uuid references companies,
  interaction_type text,
  created_at timestamp,
  ...
);

-- Market categories
create table public.market_categories (
  id uuid primary key,
  name text unique,
  parent_id uuid references market_categories,
  description text,
  ...
);

-- Company categories
create table public.company_categories (
  company_id uuid references companies,
  category_id uuid references market_categories,
  primary boolean,
  ...
);

-- Market trends
create table public.market_trends (
  id uuid primary key,
  category_id uuid references market_categories,
  metric_name text,
  metric_value decimal(10,2),
  period_start timestamp,
  period_end timestamp,
  ...
);
```

### Reporting System

```sql
-- Report templates
create table public.report_templates (
  id uuid primary key,
  name text,
  query_template text,
  parameters jsonb,
  ...
);

-- Scheduled reports
create table public.scheduled_reports (
  id uuid primary key,
  company_id uuid references companies,
  template_id uuid references report_templates,
  schedule text,
  recipients jsonb,
  ...
);

-- Report executions
create table public.report_executions (
  id uuid primary key,
  scheduled_report_id uuid references scheduled_reports,
  status text,
  result_url text,
  ...
);
```

## Notification System

### Notification Tables

```sql
-- Notification types
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

-- Notification preferences
create table public.notification_preferences (
  id uuid primary key,
  user_id uuid references users,
  notification_type text,
  channels notification_channel[],
  enabled boolean,
  ...
);

-- Notifications
create table public.notifications (
  id uuid primary key,
  user_id uuid references users,
  title text,
  content text,
  priority notification_priority,
  read_at timestamp,
  ...
);
```

## Views and Materialized Views

### Analytics Views

```sql
-- Company rating statistics
create view public.company_rating_stats as
select
  company_id,
  avg(rating) as average_rating,
  count(*) as total_ratings,
  ...
from company_ratings
group by company_id;

-- Category market size
create view public.category_market_size as
select
  category_id,
  count(distinct company_id) as total_companies,
  count(distinct interaction_id) as monthly_interactions,
  ...
from market_categories
join company_categories
...;
```

## Row Level Security (RLS)

All tables have RLS enabled with appropriate policies:
- Users can only access their own data
- Companies can only access their own company data
- Public data is accessible to all authenticated users
- Admin roles have elevated access where necessary

Example policies:

```sql
-- Users can view their own notifications
create policy "Users can view their notifications"
  on public.notifications for select
  using (user_id = auth.uid());

-- Companies can manage their scheduled reports
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
``` 