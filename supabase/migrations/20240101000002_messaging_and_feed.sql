-- Create threads table
create table public.threads (
  id uuid primary key default gen_random_uuid(),
  user_1 uuid not null references public.users(id) on delete cascade,
  user_2 uuid not null references public.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  constraint user_order_check check (user_1 < user_2),
  unique(user_1, user_2)
);

-- Create messages table
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create posts table
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  content text,
  media_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create likes table
create table public.likes (
  user_id uuid not null references public.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, post_id)
);

-- Create comments table
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create flags table
create table public.flags (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'message', 'comment')),
  target_id uuid not null,
  reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes
create index idx_messages_thread on public.messages(thread_id);
create index idx_messages_sender on public.messages(sender_id);
create index idx_posts_user on public.posts(user_id);
create index idx_comments_post on public.comments(post_id);
create index idx_comments_user on public.comments(user_id);
create index idx_flags_target on public.flags(target_type, target_id);

-- Enable RLS
alter table public.threads enable row level security;
alter table public.messages enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.flags enable row level security;

-- Create RLS policies
create policy "Users can view their threads"
  on public.threads for select
  using (auth.uid() in (user_1, user_2));

create policy "Users can create threads"
  on public.threads for insert
  with check (auth.uid() in (user_1, user_2));

create policy "Users can view messages in their threads"
  on public.messages for select
  using (
    exists (
      select 1 from public.threads
      where id = thread_id and auth.uid() in (user_1, user_2)
    )
  );

create policy "Users can send messages in their threads"
  on public.messages for insert
  with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.threads
      where id = thread_id and auth.uid() in (user_1, user_2)
    )
  );

create policy "Users can view all posts"
  on public.posts for select
  using (true);

create policy "Users can manage their own posts"
  on public.posts for all
  using (auth.uid() = user_id);

create policy "Users can manage their own likes"
  on public.likes for all
  using (auth.uid() = user_id);

create policy "Users can view all comments"
  on public.comments for select
  using (true);

create policy "Users can manage their own comments"
  on public.comments for all
  using (auth.uid() = user_id);

create policy "Users can create flags"
  on public.flags for insert
  with check (auth.uid() = reporter_id);

-- Add updated_at triggers
create trigger handle_posts_updated_at
  before update on public.posts
  for each row
  execute function public.handle_updated_at();

create trigger handle_comments_updated_at
  before update on public.comments
  for each row
  execute function public.handle_updated_at(); 