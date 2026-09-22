-- SIGNAL database schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).

create extension if not exists "pgcrypto";

create table if not exists signals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  location text not null,
  status text not null default 'emerging'
    check (status in ('emerging', 'corroborating', 'conflicting', 'unconfirmed')),
  summary text,
  why_explanation jsonb default '[]'::jsonb,
  last_updated timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
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
  signal_id uuid references signals(id) on delete set null
);

create index if not exists reports_signal_id_idx on reports(signal_id);
create index if not exists reports_location_idx on reports(location);
create index if not exists reports_reported_at_idx on reports(reported_at);

-- Demo app: no auth, so allow open read/write via anon key.
-- This is a 48-hour prototype, not a production posture.
alter table signals enable row level security;
alter table reports enable row level security;

create policy "public read signals" on signals for select using (true);
create policy "public write signals" on signals for insert with check (true);
create policy "public update signals" on signals for update using (true);

create policy "public read reports" on reports for select using (true);
create policy "public write reports" on reports for insert with check (true);
create policy "public update reports" on reports for update using (true);
