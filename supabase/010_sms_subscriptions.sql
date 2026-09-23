-- Migration: 010_sms_subscriptions.sql
-- Outbound SMS Subscriptions for Location and LGA Safety Alerts

do $$ begin
  create type public.sms_subscription_status as enum ('pending', 'active', 'unsubscribed');
exception when duplicate_object then null;
end $$;

create table if not exists public.sms_subscriptions (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null,
  location_id uuid references public.locations(id) on delete cascade,
  lga_id uuid references public.lgas(id) on delete cascade,
  status public.sms_subscription_status not null default 'pending',
  confirmation_code text,
  confirmation_expires_at timestamptz,
  attempts_count integer not null default 0,
  last_attempt_at timestamptz,
  last_alert_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_subscription_target check (
    (location_id is not null and lga_id is null) or
    (location_id is null and lga_id is not null)
  )
);

create index if not exists sms_sub_phone_location_idx
  on public.sms_subscriptions (phone_number, location_id)
  where location_id is not null and status != 'unsubscribed';

create index if not exists sms_sub_phone_lga_idx
  on public.sms_subscriptions (phone_number, lga_id)
  where lga_id is not null and status != 'unsubscribed';

create index if not exists sms_sub_active_loc_idx
  on public.sms_subscriptions (location_id, status);

create index if not exists sms_sub_active_lga_idx
  on public.sms_subscriptions (lga_id, status);

-- Enable Row Level Security (RLS) - writes happen via serverless API routes
alter table public.sms_subscriptions enable row level security;
