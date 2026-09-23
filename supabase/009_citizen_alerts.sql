-- Adds:
-- 1. A citizen's home state/LGA + phone, so they can get an SMS when a
--    dangerous report lands in their own LGA (admin-assigned, per product
--    decision — not self-service).
-- 2. A "verified informant" trust badge admins can grant any account,
--    denormalized onto their reports so the classification AI can see it.
-- Safe to re-run.

alter table public.profiles add column if not exists home_state_id uuid references public.states(id) on delete set null;
alter table public.profiles add column if not exists home_lga_id uuid references public.lgas(id) on delete set null;
alter table public.profiles add column if not exists is_verified_informant boolean not null default false;

alter table public.reports add column if not exists reporter_verified boolean not null default false;

create index if not exists profiles_home_lga_id_idx on public.profiles(home_lga_id);
