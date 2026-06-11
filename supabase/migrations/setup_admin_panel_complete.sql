-- =========================================================================
-- COMPLETE SETUP MIGRATION: ADMIN CONTROL TOWER FEATURES & STATS VIEWS
-- Run this script in the Supabase SQL Editor to set up all tables and views
-- =========================================================================

-- 1. API USAGE LOGS TABLE
create table if not exists public.api_usage_logs (
  id uuid default gen_random_uuid() primary key,
  route text not null, -- '/api/analyze' or '/api/video'
  user_id uuid references auth.users(id) on delete set null,
  status text default 'success'::text not null, -- 'success' or 'error'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.api_usage_logs enable row level security;

drop policy if exists "Allow insert for all users" on public.api_usage_logs;
create policy "Allow insert for all users" on public.api_usage_logs 
  for insert with check (true);

create index if not exists idx_api_usage_logs_route_created on public.api_usage_logs(route, created_at);


-- 2. B2C PRACTICE TASKS TABLE
create table if not exists public.practice_tasks (
  id uuid default gen_random_uuid() primary key,
  topic_of_the_day text not null,
  word_of_the_day text,
  definition text,
  reading_text text,
  bullets jsonb,
  difficulty_level text default 'Beginner'::text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.practice_tasks enable row level security;

drop policy if exists "Anyone can view practice tasks" on public.practice_tasks;
create policy "Anyone can view practice tasks" on public.practice_tasks
  for select using (true);

drop policy if exists "Admins can manage practice tasks" on public.practice_tasks;
create policy "Admins can manage practice tasks" on public.practice_tasks
  for all using (true);


-- 3. CUSTOMER SUPPORT TICKETS TABLE
create table if not exists public.support_tickets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  category text not null,
  message text not null,
  status text default 'open'::text not null check (status in ('open', 'investigating', 'resolved')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.support_tickets enable row level security;

drop policy if exists "Allow insert for all users" on public.support_tickets;
create policy "Allow insert for all users" on public.support_tickets 
  for insert with check (true);

drop policy if exists "Admins can do everything on tickets" on public.support_tickets;
create policy "Admins can do everything on tickets" on public.support_tickets
  for all using (true);


-- 4. HELPER FUNCTION TO SET USER ADMIN ROLE
create or replace function public.set_user_admin(target_email text)
returns void as $$
begin
  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
  where email = target_email;
end;
$$ language plpgsql security definer;


-- 5. ADMIN STATS VIEW (SECURITY INVOKER)
drop view if exists public.admin_stats;
create or replace view public.admin_stats
with (security_invoker = true) as
with daily_recordings as (
  select 
    created_at::date as stat_date,
    count(*) as recordings_count
  from public.recordings
  group by 1
),
daily_api_analyze as (
  select 
    created_at::date as stat_date,
    count(*) as analyze_calls_count
  from public.api_usage_logs
  where route = '/api/analyze'
  group by 1
),
daily_api_video as (
  select 
    created_at::date as stat_date,
    count(*) as video_calls_count
  from public.api_usage_logs
  where route = '/api/video'
  group by 1
),
daily_active_users as (
  select stat_date, count(distinct user_id) as active_users_count
  from (
    select created_at::date as stat_date, user_id from public.recordings
    union all
    select created_at::date as stat_date, user_id from public.api_usage_logs
  ) combined
  group by stat_date
)
select 
  d.stat_date,
  coalesce(dr.recordings_count, 0) as recordings_count,
  coalesce(da.analyze_calls_count, 0) as analyze_calls_count,
  coalesce(dv.video_calls_count, 0) as video_calls_count,
  coalesce(dau.active_users_count, 0) as active_users_count
from (
  select distinct stat_date from (
    select created_at::date as stat_date from public.recordings
    union all
    select created_at::date as stat_date from public.api_usage_logs
  ) dates
) d
left join daily_recordings dr on dr.stat_date = d.stat_date
left join daily_api_analyze da on da.stat_date = d.stat_date
left join daily_api_video dv on dv.stat_date = d.stat_date
left join daily_active_users dau on dau.stat_date = d.stat_date
order by d.stat_date desc;
