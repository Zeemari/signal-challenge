-- Adds SMS danger-alert contact info to profiles. Safe to re-run.

alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists sms_alerts_enabled boolean not null default true;
