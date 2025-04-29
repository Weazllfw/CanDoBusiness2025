-- Create billing history table
create table public.billing_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  subscription_id uuid references public.company_subscriptions(id) on delete set null,
  amount decimal(10,2) not null,
  currency text not null default 'CAD',
  status text not null check (status in ('pending', 'completed', 'failed', 'refunded')),
  payment_method text,
  invoice_url text,
  billing_period_start timestamp with time zone,
  billing_period_end timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create referral system tables
create table public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null unique,
  discount_percent int check (discount_percent between 0 and 100),
  max_uses int,
  uses_count int default 0,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.referral_claims (
  id uuid primary key default gen_random_uuid(),
  referral_code_id uuid not null references public.referral_codes(id) on delete cascade,
  referred_company_id uuid not null references public.companies(id) on delete cascade,
  status text not null check (status in ('pending', 'applied', 'expired')),
  applied_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create enhanced analytics tables
create table public.company_interactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  interacted_with_company_id uuid not null references public.companies(id) on delete cascade,
  interaction_type text not null check (interaction_type in (
    'profile_view',
    'rfq_sent',
    'rfq_received',
    'message_sent',
    'message_received',
    'connection_request',
    'connection_accepted'
  )),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.user_activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  activity_type text not null,
  metadata jsonb default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes
create index idx_billing_history_company on public.billing_history(company_id);
create index idx_billing_history_status on public.billing_history(status);
create index idx_referral_codes_company on public.referral_codes(company_id);
create index idx_referral_codes_code on public.referral_codes(code);
create index idx_referral_claims_code on public.referral_claims(referral_code_id);
create index idx_company_interactions_company on public.company_interactions(company_id);
create index idx_company_interactions_with on public.company_interactions(interacted_with_company_id);
create index idx_user_activity_log_user on public.user_activity_log(user_id);
create index idx_user_activity_log_company on public.user_activity_log(company_id);
create index idx_user_activity_log_type on public.user_activity_log(activity_type);

-- Create enhanced analytics views
create view public.company_interaction_metrics as
select
  c.id as company_id,
  c.name as company_name,
  date_trunc('month', ci.created_at) as month,
  count(*) filter (where ci.interaction_type = 'profile_view') as profile_views_given,
  count(*) filter (where ci.interaction_type = 'rfq_sent') as rfqs_sent,
  count(*) filter (where ci.interaction_type = 'rfq_received') as rfqs_received,
  count(*) filter (where ci.interaction_type = 'message_sent') as messages_sent,
  count(*) filter (where ci.interaction_type = 'message_received') as messages_received,
  count(*) filter (where ci.interaction_type = 'connection_request') as connections_requested,
  count(*) filter (where ci.interaction_type = 'connection_accepted') as connections_accepted
from public.companies c
left join public.company_interactions ci on ci.company_id = c.id
group by c.id, c.name, date_trunc('month', ci.created_at);

-- Enable RLS
alter table public.billing_history enable row level security;
alter table public.referral_codes enable row level security;
alter table public.referral_claims enable row level security;
alter table public.company_interactions enable row level security;
alter table public.user_activity_log enable row level security;

-- Create RLS policies
create policy "Companies can view their own billing history"
  on public.billing_history for select
  using (
    exists (
      select 1 from public.user_company_link
      where company_id = billing_history.company_id
      and user_id = auth.uid()
      and role in ('admin', 'billing')
    )
  );

create policy "Companies can manage their referral codes"
  on public.referral_codes for all
  using (
    exists (
      select 1 from public.user_company_link
      where company_id = referral_codes.company_id
      and user_id = auth.uid()
      and role = 'admin'
    )
  );

create policy "Companies can view their referral claims"
  on public.referral_claims for select
  using (
    exists (
      select 1 from public.referral_codes
      where id = referral_claims.referral_code_id
      and company_id in (
        select company_id from public.user_company_link
        where user_id = auth.uid()
      )
    )
  );

create policy "Companies can view their interactions"
  on public.company_interactions for select
  using (
    company_id in (
      select company_id from public.user_company_link
      where user_id = auth.uid()
    ) or
    interacted_with_company_id in (
      select company_id from public.user_company_link
      where user_id = auth.uid()
    )
  );

create policy "Users can view their own activity log"
  on public.user_activity_log for select
  using (user_id = auth.uid());

-- Add updated_at triggers
create trigger handle_billing_history_updated_at
  before update on public.billing_history
  for each row
  execute function public.handle_updated_at(); 