-- Migration to add perceived_situation column to reports table
alter table public.reports add column if not exists perceived_situation text;
