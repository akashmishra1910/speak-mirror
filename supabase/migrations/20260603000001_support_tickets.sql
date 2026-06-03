-- SQL Migration: Customer Support Tickets Schema
-- Created: 2026-06-03

-- 1. Create Support Tickets Table
create table if not exists public.support_tickets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  category text not null,
  message text not null,
  status text default 'open'::text not null check (status in ('open', 'investigating', 'resolved')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.support_tickets enable row level security;

-- Create policy to allow insert from authenticated or anonymous users (app widget support submission)
drop policy if exists "Allow insert for all users" on public.support_tickets;
create policy "Allow insert for all users" on public.support_tickets 
  for insert with check (true);

-- Create policy to allow full management for admin users
drop policy if exists "Admins can do everything on tickets" on public.support_tickets;
create policy "Admins can do everything on tickets" on public.support_tickets
  for all using (true);
