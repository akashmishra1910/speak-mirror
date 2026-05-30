-- SQL Migration: Add Face Analysis Metrics to Recordings Table
-- Created: 2026-05-30

alter table public.recordings 
  add column if not exists eye_contact numeric,
  add column if not exists expression_score numeric;
