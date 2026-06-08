-- SQL Migration: Update admin_stats view to use SECURITY INVOKER
-- Created: 2026-06-08

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
