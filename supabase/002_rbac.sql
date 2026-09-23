-- Incremental RBAC migration for databases that already ran schema.sql.
-- Run this once before deploying the RBAC application changes.

do 'begin
  execute ''create type public.app_role as enum (''''citizen'''', ''''responder'''', ''''admin'''')'';
exception when duplicate_object then null;
end;';

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role public.app_role not null default 'citizen',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists role public.app_role not null default 'citizen';
alter table public.profiles add column if not exists is_active boolean not null default true;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

alter table public.reports add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.reports add column if not exists review_status text not null default 'unverified';
alter table public.reports add column if not exists reviewed_by uuid references auth.users(id) on delete set null;
alter table public.reports add column if not exists reviewed_at timestamptz;
alter table public.reports add column if not exists responder_notes text;
alter table public.reports add column if not exists responder_name text;
alter table public.reports add column if not exists perceived_situation text;
alter table public.signals add column if not exists review_status text not null default 'unverified';
alter table public.signals add column if not exists responder_notes text;
alter table public.signals add column if not exists reviewed_by uuid references auth.users(id) on delete set null;
alter table public.signals add column if not exists reviewed_at timestamptz;

alter table public.reports drop constraint if exists reports_review_status_check;
alter table public.reports add constraint reports_review_status_check
  check (review_status in ('unverified', 'verified', 'rejected'));
alter table public.signals drop constraint if exists signals_review_status_check;
alter table public.signals add constraint signals_review_status_check
  check (review_status in ('unverified', 'verified', 'rejected'));

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (action in (
    'report_verified', 'report_rejected', 'signal_status_changed',
    'role_changed', 'user_activated', 'user_deactivated'
  )),
  report_id uuid references public.reports(id) on delete set null,
  signal_id uuid references public.signals(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.signals enable row level security;
alter table public.reports enable row level security;
alter table public.audit_logs enable row level security;

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

do 'begin
  execute concat(''drop policy if exists '', chr(34), ''public read signals'', chr(34), '' on public.signals'');
  execute concat(''drop policy if exists '', chr(34), ''public write signals'', chr(34), '' on public.signals'');
  execute concat(''drop policy if exists '', chr(34), ''public update signals'', chr(34), '' on public.signals'');
  execute concat(''drop policy if exists '', chr(34), ''public read reports'', chr(34), '' on public.reports'');
  execute concat(''drop policy if exists '', chr(34), ''public write reports'', chr(34), '' on public.reports'');
  execute concat(''drop policy if exists '', chr(34), ''public update reports'', chr(34), '' on public.reports'');
end;';

drop policy if exists profiles_self_read on public.profiles;
drop policy if exists profiles_staff_read on public.profiles;
drop policy if exists profiles_admin_update on public.profiles;
drop policy if exists public_signals_read on public.signals;
drop policy if exists owner_or_staff_reports_read on public.reports;
drop policy if exists staff_audit_read on public.audit_logs;

create policy profiles_self_read on public.profiles for select using (id = auth.uid());
create policy profiles_staff_read on public.profiles for select using (public.is_responder_or_admin());
create policy profiles_admin_update on public.profiles for update
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
create policy public_signals_read on public.signals for select using (true);
create policy owner_or_staff_reports_read on public.reports for select using (
  created_by = auth.uid() or public.is_responder_or_admin()
);
create policy staff_audit_read on public.audit_logs for select
  using (public.is_responder_or_admin());

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists reports_created_by_idx on public.reports(created_by);
create index if not exists reports_review_status_idx on public.reports(review_status);
create index if not exists audit_logs_actor_id_idx on public.audit_logs(actor_id);
