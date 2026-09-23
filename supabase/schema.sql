-- SIGNAL database schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).

create extension if not exists "pgcrypto";

do $$ begin
create type public.app_role as enum ('citizen', 'responder', 'admin');
exception when duplicate_object then null;
end $$;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role public.app_role not null default 'citizen',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into profiles (id)
select id from auth.users
on conflict (id) do nothing;

create table if not exists signals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  location text not null,
  status text not null default 'emerging'
    check (status in ('emerging', 'corroborating', 'conflicting', 'unconfirmed')),
  review_status text not null default 'unverified'
    check (review_status in ('unverified', 'verified', 'rejected')),
  summary text,
  why_explanation jsonb default '[]'::jsonb,
  responder_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  last_updated timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  content text not null,
  location text not null,
  source_type text not null
    check (source_type in (
      'direct_observation',
      'trusted_community',
      'authority',
      'phone',
      'whatsapp',
      'secondhand',
      'unknown'
    )),
  category text,
  reported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  ai_summary text,
  ai_event_type text,
  ai_entities jsonb default '[]'::jsonb,
  ai_urgency text check (ai_urgency in ('low', 'medium', 'high')),
  ai_confidence text not null default 'unverified',
  review_status text not null default 'unverified'
    check (review_status in ('unverified', 'verified', 'rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  responder_notes text,
  signal_id uuid references signals(id) on delete set null
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (action in (
    'report_verified', 'report_rejected', 'signal_status_changed',
    'role_changed', 'user_activated', 'user_deactivated'
  )),
  report_id uuid references reports(id) on delete set null,
  signal_id uuid references signals(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists reports_signal_id_idx on reports(signal_id);
create index if not exists reports_location_idx on reports(location);
create index if not exists reports_reported_at_idx on reports(reported_at);

-- Public signals are readable. Writes happen only through authenticated server endpoints.
alter table signals enable row level security;
alter table reports enable row level security;
alter table profiles enable row level security;
alter table audit_logs enable row level security;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as 'begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> ''display_name'', ''''))
  on conflict (id) do nothing;
  return new;
end;';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.current_user_role()
returns public.app_role language sql stable security definer set search_path = public
as 'select role from public.profiles where id = auth.uid() and is_active = true;';

create or replace function public.is_responder_or_admin()
returns boolean language sql stable security definer set search_path = public
as 'select public.current_user_role() in (''responder'', ''admin'');';

create policy "public read signals" on signals for select using (true);
create policy "public write signals" on signals for insert with check (true);
create policy "public update signals" on signals for update using (true);

create policy "public read reports" on reports for select using (true);
create policy "public write reports" on reports for insert with check (true);
create policy "public update reports" on reports for update using (true);
-- Apply supabase/002_rbac.sql after this base schema for secure policies.

do 'begin
  execute concat(''drop policy if exists '', chr(34), ''public read signals'', chr(34), '' on public.signals'');
  execute concat(''drop policy if exists '', chr(34), ''public write signals'', chr(34), '' on public.signals'');
  execute concat(''drop policy if exists '', chr(34), ''public update signals'', chr(34), '' on public.signals'');
  execute concat(''drop policy if exists '', chr(34), ''public read reports'', chr(34), '' on public.reports'');
  execute concat(''drop policy if exists '', chr(34), ''public write reports'', chr(34), '' on public.reports'');
  execute concat(''drop policy if exists '', chr(34), ''public update reports'', chr(34), '' on public.reports'');
end;';
drop policy if exists profiles_self_read on profiles;
drop policy if exists profiles_staff_read on profiles;
drop policy if exists profiles_admin_update on profiles;
drop policy if exists public_signals_read on signals;
drop policy if exists owner_or_staff_reports_read on reports;
drop policy if exists staff_audit_read on audit_logs;
create policy profiles_self_read on profiles for select using (id = auth.uid());
create policy profiles_staff_read on profiles for select using (public.is_responder_or_admin());
create policy profiles_admin_update on profiles for update
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
create policy public_signals_read on signals for select using (true);
create policy owner_or_staff_reports_read on reports for select using (
  created_by = auth.uid() or public.is_responder_or_admin()
);
create policy staff_audit_read on audit_logs for select
  using (public.is_responder_or_admin());
