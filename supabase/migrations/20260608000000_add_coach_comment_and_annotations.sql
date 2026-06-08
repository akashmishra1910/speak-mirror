-- SQL Migration: Add Coach Comment and Transcript Annotations to Recordings Table
-- Created: 2026-06-08

alter table public.recordings 
  add column if not exists coach_comment text,
  add column if not exists annotations jsonb;
