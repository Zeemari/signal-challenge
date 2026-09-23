-- Migration: 011_verified_correspondent.sql
-- Adds is_verified_correspondent flag to profiles for fast-tracking SMS alerts

alter table public.profiles add column if not exists is_verified_correspondent boolean not null default false;

create index if not exists profiles_verified_correspondent_idx on public.profiles(is_verified_correspondent) where is_verified_correspondent = true;
