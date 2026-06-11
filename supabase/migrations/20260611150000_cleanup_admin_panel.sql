-- Migration: Complete Removal of Admin Panel Database Objects
-- Created: 2026-06-11

-- Drop the view
drop view if exists public.admin_stats;

-- Drop tables
drop table if exists public.support_tickets cascade;
drop table if exists public.practice_tasks cascade;
drop table if exists public.api_usage_logs cascade;

-- Drop function
drop function if exists public.set_user_admin(text);

-- Clean up auth user metadata role
update auth.users
set raw_user_meta_data = raw_user_meta_data - 'role'
where raw_user_meta_data->>'role' = 'admin';
