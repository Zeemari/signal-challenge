-- Add responder_name column to reports table for storing responder names on report submission
alter table public.reports add column if not exists responder_name text;
