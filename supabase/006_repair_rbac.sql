-- Repair migration: the original 002_rbac.sql failed partway through (the
-- profiles table already existed with a different shape, so its
-- `create table if not exists` no-opped and never added the expected
-- columns; audit_logs and the RLS/policy statements after it never ran
-- either). Every statement here is safe to re-run.

-- 1. Enum type
do $$ begin
  create type public.app_role as enum ('citizen', 'responder', 'admin');
exception when duplicate_object then null;
end $$;

-- 2. profiles table + columns
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade
);
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists role public.app_role not null default 'citizen';
alter table public.profiles add column if not exists is_active boolean not null default true;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- If `role` already existed (e.g. as plain text, from an earlier partial
-- attempt), the ADD COLUMN above was a no-op and it's still the wrong type.
-- This forces it to the enum type regardless of its current type, safely
-- (a no-op if it's already app_role).
alter table public.profiles alter column role drop default;
alter table public.profiles alter column role type public.app_role using role::text::public.app_role;
alter table public.profiles alter column role set default 'citizen';
alter table public.profiles alter column role set not null;

insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- 3. reports / signals extra columns
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

-- 4. audit_logs table (this was the missing piece from the last error)
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

-- 5. RLS on every table it belongs on
alter table public.profiles enable row level security;
alter table public.signals enable row level security;
alter table public.reports enable row level security;
alter table public.audit_logs enable row level security;

-- 6. Functions
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- A previous partial run may have created this returning `text` instead of
-- `app_role`; CREATE OR REPLACE can't change a function's return type, so
-- drop it first (cascades to is_responder_or_admin and any policies that
-- reference it — both are recreated below).
drop function if exists public.current_user_role() cascade;
drop function if exists public.is_responder_or_admin() cascade;

create function public.current_user_role()
returns public.app_role language sql stable security definer set search_path = public
as $$select role from public.profiles where id = auth.uid() and is_active = true;$$;

create or replace function public.is_responder_or_admin()
returns boolean language sql stable security definer set search_path = public
as $$select public.current_user_role() in ('responder', 'admin');$$;

-- 7. Drop old permissive open-access policies if they still exist
drop policy if exists "public read signals" on public.signals;
drop policy if exists "public write signals" on public.signals;
drop policy if exists "public update signals" on public.signals;
drop policy if exists "public read reports" on public.reports;
drop policy if exists "public write reports" on public.reports;
drop policy if exists "public update reports" on public.reports;

-- 8. Create the intended policies
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

-- 9. Indexes
create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists reports_created_by_idx on public.reports(created_by);
create index if not exists reports_review_status_idx on public.reports(review_status);
create index if not exists audit_logs_actor_id_idx on public.audit_logs(actor_id);
