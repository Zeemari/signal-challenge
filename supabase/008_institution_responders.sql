-- Lets a responder/admin account carry an institution affiliation (police
-- station, verified news outlet, newspaper, etc.) that's shown wherever
-- their reports are attributed. Safe to re-run.

alter table public.profiles add column if not exists institution_name text;
alter table public.profiles add column if not exists institution_type text;
alter table public.profiles drop constraint if exists profiles_institution_type_check;
alter table public.profiles add constraint profiles_institution_type_check
  check (institution_type is null or institution_type in (
    'police_station', 'news_outlet', 'newspaper', 'government_agency', 'ngo', 'other'
  ));

-- Denormalized onto the report at submission time, same pattern as the
-- existing responder_name column — so a later change to a responder's
-- institution doesn't rewrite the attribution on reports they already filed.
alter table public.reports add column if not exists responder_institution_name text;
alter table public.reports add column if not exists responder_institution_type text;
