-- Migration: 005_location_hierarchy.sql
-- Nigeria Location Hierarchy (States, LGAs, Locations) with RBAC

create extension if not exists "pgcrypto";

-- 1. States table
create table if not exists public.states (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null unique,
  created_at timestamptz not null default now()
);

-- 2. LGAs table
create table if not exists public.lgas (
  id uuid primary key default gen_random_uuid(),
  state_id uuid not null references public.states(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  constraint lgas_state_name_unique unique (state_id, name)
);

-- 3. Enum types & Locations table
do $$ begin
  create type public.location_source as enum ('admin', 'community');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.location_status as enum ('approved', 'pending', 'rejected');
exception when duplicate_object then null;
end $$;

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  lga_id uuid not null references public.lgas(id) on delete cascade,
  name text not null,
  source public.location_source not null default 'community',
  status public.location_status not null default 'pending',
  submitted_by uuid references public.profiles(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint locations_lga_name_unique unique (lga_id, lower(name))
);

-- 4. Adapt reports table
alter table public.reports 
  add column if not exists location_id uuid references public.locations(id) on delete set null,
  add column if not exists state_id uuid references public.states(id) on delete set null,
  add column if not exists lga_id uuid references public.lgas(id) on delete set null;

-- Indexes
create index if not exists lgas_state_id_idx on public.lgas(state_id);
create index if not exists locations_lga_id_idx on public.locations(lga_id);
create index if not exists locations_status_idx on public.locations(status);
create index if not exists reports_location_id_idx on public.reports(location_id);

-- RLS Policies
alter table public.states enable row level security;
alter table public.lgas enable row level security;
alter table public.locations enable row level security;

-- Public read access to static states and lgas
drop policy if exists public_read_states on public.states;
create policy public_read_states on public.states for select using (true);

drop policy if exists public_read_lgas on public.lgas;
create policy public_read_lgas on public.lgas for select using (true);

-- Locations RLS:
-- 1. Public can read approved locations, or pending locations they created
drop policy if exists locations_read_policy on public.locations;
create policy locations_read_policy on public.locations for select using (
  status = 'approved' or submitted_by = auth.uid() or public.is_responder_or_admin()
);

-- 2. Authenticated citizens/staff can insert locations
drop policy if exists locations_insert_policy on public.locations;
create policy locations_insert_policy on public.locations for insert with check (
  auth.role() = 'authenticated'
);

-- 3. Only staff (responder/admin) can update locations
drop policy if exists locations_update_policy on public.locations;
create policy locations_update_policy on public.locations for update using (
  public.is_responder_or_admin()
);

-- SEED DATA FOR STATES & LGAs
do $$
declare
  s_id uuid;
begin
  -- State: Abia
  insert into public.states (name, code) values ('Abia', 'AB')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Abia'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Aba North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Aba South') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Arochukwu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Bende') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ikwuano') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Isiala Ngwa North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Isiala Ngwa South') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Isuikwuato') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Obi Ngwa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ohafia') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Osisioma') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ugwunagbo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ukwa East') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ukwa West') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Umuahia North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Umuahia South') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Umu Nneochi') on conflict (state_id, name) do nothing;

  -- State: Adamawa
  insert into public.states (name, code) values ('Adamawa', 'AD')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Adamawa'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Demsa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Fufure') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ganye') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Gayuk') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Gombi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Grie') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Hong') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Jada') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Lamurde') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Madagali') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Maiha') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Mayo Belwa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Michika') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Mubi North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Mubi South') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Numan') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Shelleng') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Song') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Toungo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Yewa North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Yola North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Yola South') on conflict (state_id, name) do nothing;

  -- State: Akwa Ibom
  insert into public.states (name, code) values ('Akwa Ibom', 'AK')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Akwa Ibom'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Abak') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Eastern Obolo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Eket') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Esit Eket') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Essien Udim') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Etim Ekpo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Etinan') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ibeno') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ibesikpo Asutan') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ibiono-Ibom') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ika') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ikono') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ikot Abasi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ikot Ekpene') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ini') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Mbo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Mkpat-Enin') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Nsit-Atai') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Nsit-Ibiom') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Nsit-Ubium') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Obot Akara') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Okobo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Onna') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Oron') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Oruk Anam') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Udung-Uko') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ukanafun') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Uruan') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Urue-Offong/Oruko') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Uyo') on conflict (state_id, name) do nothing;

  -- State: Anambra
  insert into public.states (name, code) values ('Anambra', 'AN')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Anambra'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Aguata') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Anambra East') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Anambra West') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Anaocha') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Awka North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Awka South') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ayamelum') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Dunukofia') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ekwusigo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Idemili North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Idemili South') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ihiala') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Njikoka') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Nnewi North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Nnewi South') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ogbaru') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Onitsha North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Onitsha South') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Orumba North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Orumba South') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Oyi') on conflict (state_id, name) do nothing;

  -- State: Bauchi
  insert into public.states (name, code) values ('Bauchi', 'BA')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Bauchi'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Alkaleri') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Bauchi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Bogoro') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Damban') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Darazo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Dass') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Gamawa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ganjuwa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Giade') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Itas/Gadau') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Jama''are') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Katagum') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kirfi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Misau') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ningi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Shira') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Tafawa Balewa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Toro') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Warji') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Zaki') on conflict (state_id, name) do nothing;

  -- State: Bayelsa
  insert into public.states (name, code) values ('Bayelsa', 'BY')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Bayelsa'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Brass') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ekeremor') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kolokuma/Opokuma') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Nembe') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ogbia') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Sagbama') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Southern Ijaw') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Yenagoa') on conflict (state_id, name) do nothing;

  -- State: Benue
  insert into public.states (name, code) values ('Benue', 'BE')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Benue'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Agatu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Apa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ado') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Buruku') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Gboko') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Guma') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Gwer East') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Gwer West') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Katsina-Ala') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Konshisha') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kwande') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Logo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Makurdi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Obi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ogbadibo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ohimini') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Oju') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Okpokwu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Oturkpo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Tarka') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ukum') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ushongo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Vandeikya') on conflict (state_id, name) do nothing;

  -- State: Borno
  insert into public.states (name, code) values ('Borno', 'BO')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Borno'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Abadam') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Askira/Uba') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Bama') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Bayo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Biu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Chibok') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Damboa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Dikwa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Gubio') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Guzamala') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Gwoza') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Hawul') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Jere') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kaga') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kala/Balge') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Konduga') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kukawa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kwaya Kusar') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Mafa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Magumeri') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Maiduguri') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Marte') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Mobbar') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Monguno') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ngala') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Nganzai') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Shani') on conflict (state_id, name) do nothing;

  -- State: Cross River
  insert into public.states (name, code) values ('Cross River', 'CR')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Cross River'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Abi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Akamkpa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Akpabuyo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Bakassi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Bekwarra') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Biase') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Boki') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Calabar Municipal') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Calabar South') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Etung') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ikom') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Obanliku') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Obubra') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Obudu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Odukpani') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ogoja') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Yakuur') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Yala') on conflict (state_id, name) do nothing;

  -- State: Delta
  insert into public.states (name, code) values ('Delta', 'DE')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Delta'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Aniocha North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Aniocha South') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Bomadi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Burutu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ethiope East') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ethiope West') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ika North East') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ika South') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Isoko North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Isoko South') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ndokwa East') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ndokwa West') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Okpe') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Oshimili North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Oshimili South') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Patani') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Sapele') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Udu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ughelli North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ughelli South') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ukwuani') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Uvwie') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Warri North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Warri South') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Warri South West') on conflict (state_id, name) do nothing;

  -- State: Ebonyi
  insert into public.states (name, code) values ('Ebonyi', 'EB')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Ebonyi'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Abakaliki') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Afikpo North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Afikpo South') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ebonyi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ezza North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ezza South') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ikwo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ishielu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ivo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Izzi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ohaozara') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ohaukwu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Onicha') on conflict (state_id, name) do nothing;

  -- State: Edo
  insert into public.states (name, code) values ('Edo', 'ED')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Edo'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Akoko-Edo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Egor') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Esan Central') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Esan North-East') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Esan South-East') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Esan West') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Etsako Central') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Etsako East') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Etsako West') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Igueben') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ikpoba Okha') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Oredo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Orhionmwon') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ovia North-East') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ovia South-West') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Owan East') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Owan West') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Uhunmwonde') on conflict (state_id, name) do nothing;

  -- State: Ekiti
  insert into public.states (name, code) values ('Ekiti', 'EK')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Ekiti'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Ado Ekiti') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Efon') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ekiti East') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ekiti South-West') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ekiti West') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Emure') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Gbonyin') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Iddo Osi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ijero') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ikere') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ikole') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ilejemeje') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Irepodun/Ifelodun') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ise/Orun') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Moba') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Oye') on conflict (state_id, name) do nothing;

  -- State: Enugu
  insert into public.states (name, code) values ('Enugu', 'EN')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Enugu'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Aninri') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Awgu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Enugu East') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Enugu North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Enugu South') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ezeagu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Igbo Etiti') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Igbo Eze North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Igbo Eze South') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Isi Uzo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Nkanu East') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Nkanu West') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Nsukka') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Oji River') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Udenu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Udi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Uzo Uwani') on conflict (state_id, name) do nothing;

  -- State: FCT
  insert into public.states (name, code) values ('FCT', 'FC')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'FCT'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Abaji') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Bwari') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Gwagwalada') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kuje') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kwali') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Abuja Municipal') on conflict (state_id, name) do nothing;

  -- State: Gombe
  insert into public.states (name, code) values ('Gombe', 'GO')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Gombe'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Akko') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Balanga') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Billiri') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Dukku') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Funakaye') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Gombe') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kaltungo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kwami') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Nafada') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Shongom') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Yamaltu/Deba') on conflict (state_id, name) do nothing;

  -- State: Imo
  insert into public.states (name, code) values ('Imo', 'IM')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Imo'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Aboh Mbaise') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ahiazu Mbaise') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ehime Mbano') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ezinihitte') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ideato North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ideato South') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ihitte/Uboma') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ikeduru') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Isiala Mbano') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Isu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Mbaitoli') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ngor Okpala') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Njaba') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Nkwerre') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Nwangele') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Obowo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Oguta') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ohaji/Egbema') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Okigwe') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Orlu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Orsu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Oru East') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Oru West') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Owerri Municipal') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Owerri North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Owerri West') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Unuimo') on conflict (state_id, name) do nothing;

  -- State: Jigawa
  insert into public.states (name, code) values ('Jigawa', 'JI')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Jigawa'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Auyo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Babura') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Biriniwa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Birnin Kudu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Buji') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Dutse') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Gagarawa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Garki') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Gumel') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Guri') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Gwaram') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Gwiwa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Hadejia') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Jahun') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kafin Hausa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kaugama') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kazaure') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kiri Kasama') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kiyawa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Maigatari') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Malam Madori') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Miga') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ringim') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Roni') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Sule Tankarkar') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Taura') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Yankwashi') on conflict (state_id, name) do nothing;

  -- State: Kaduna
  insert into public.states (name, code) values ('Kaduna', 'KD')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Kaduna'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Birnin Gwari') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Chikun') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Giwa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Igabi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ikara') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Jaba') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Jema''a') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kachia') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kaduna North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kaduna South') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kagarko') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kajuru') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kaura') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kauru') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kubau') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kudan') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Lere') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Makarfi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Sabon Gari') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Sanga') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Soba') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Zangon Kataf') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Zaria') on conflict (state_id, name) do nothing;

  -- State: Kano
  insert into public.states (name, code) values ('Kano', 'KN')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Kano'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Ajingi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Albasu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Bagwai') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Bebeji') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Bichi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Bunkure') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Dala') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Dambatta') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Dawakin Kudu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Dawakin Tofa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Doguwa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Fagge') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Gabasawa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Garko') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Garun Mallam') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Gaya') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Gezawa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Gwale') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Gwarzo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kabo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kano Municipal') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Karaye') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kibiya') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kiru') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kumbotso') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kunchi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kura') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Madobi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Makoda') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Minjibir') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Nasarawa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Rano') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Rimin Gado') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Rogo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Shanono') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Sumaila') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Takai') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Tarauni') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Tofa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Tsanyawa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Tudun Wada') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ungogo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Warawa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Wudil') on conflict (state_id, name) do nothing;

  -- State: Katsina
  insert into public.states (name, code) values ('Katsina', 'KT')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Katsina'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Bakori') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Batagarawa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Batsari') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Baure') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Bindawa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Charanchi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Dandume') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Danja') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Dan Musa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Daura') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Dutsi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Dutsin Ma') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Faskari') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Funtua') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ingawa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Jibia') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kafur') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kaita') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kankara') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kankia') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Katsina') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kurfi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kusada') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Mai''Adua') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Malumfashi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Mani') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Mashi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Matazu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Musawa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Rimi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Sabuwa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Safana') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Sandamu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Zango') on conflict (state_id, name) do nothing;

  -- State: Kebbi
  insert into public.states (name, code) values ('Kebbi', 'KE')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Kebbi'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Aleiro') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Arewa Dandi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Argungu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Augie') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Bagudo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Birnin Kebbi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Bunza') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Dandi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Fakai') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Gwandu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Jega') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kalgo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Koko/Besse') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Maiyama') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ngaski') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Sakaba') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Shanga') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Suru') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Wasagu/Danko') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Yauri') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Zuru') on conflict (state_id, name) do nothing;

  -- State: Kogi
  insert into public.states (name, code) values ('Kogi', 'KO')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Kogi'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Adavi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ajaokuta') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ankpa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Bassa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Dekina') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ibaji') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Idah') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Igalamela Odolu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ijumu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kabba/Bunu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kogi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Lokoja') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Mopa Muro') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ofu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ogori/Magongo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Okehi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Okene') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Olamaboro') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Omala') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Yagba East') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Yagba West') on conflict (state_id, name) do nothing;

  -- State: Kwara
  insert into public.states (name, code) values ('Kwara', 'KW')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Kwara'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Asa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Baruten') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Edu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ekiti') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ifelodun') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ilorin East') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ilorin South') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ilorin West') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Irepodun') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Isin') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kaiama') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Moro') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Offa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Oke Ero') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Oyun') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Pategi') on conflict (state_id, name) do nothing;

  -- State: Lagos
  insert into public.states (name, code) values ('Lagos', 'LA')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Lagos'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Agege') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ajeromi-Ifelodun') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Alimosho') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Amuwo-Odofin') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Apapa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Badagry') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Epe') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Eti Osa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ibeju-Lekki') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ifako-Ijaiye') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ikeja') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ikorodu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kosov') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Lagos Island') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Lagos Mainland') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Mushin') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ojo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Oshodi-Isolo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Somolu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Surulere') on conflict (state_id, name) do nothing;

  -- State: Nasarawa
  insert into public.states (name, code) values ('Nasarawa', 'NA')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Nasarawa'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Akwanga') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Awe') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Doma') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Karu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Keana') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Keffi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kokona') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Lafia') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Nasarawa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Nasarawa Egon') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Obi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Toto') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Wamba') on conflict (state_id, name) do nothing;

  -- State: Niger
  insert into public.states (name, code) values ('Niger', 'NI')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Niger'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Agaie') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Agwara') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Bida') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Borgu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Bosso') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Chanchaga') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Edati') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Gbako') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Gurara') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Katcha') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kontagora') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Lapai') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Lavun') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Magama') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Mariga') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Mokwa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Moya') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Paikoro') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Rafi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Rijau') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Shiroro') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Suleja') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Tafa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Wushishi') on conflict (state_id, name) do nothing;

  -- State: Ogun
  insert into public.states (name, code) values ('Ogun', 'OG')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Ogun'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Abeokuta North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Abeokuta South') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ado-Odo/Ota') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Egbado North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Egbado South') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ewekoro') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ifo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ijebu East') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ijebu North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ijebu North East') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ijebu Ode') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ikenne') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Imeko Afon') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ipokia') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Obafemi Owode') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Odeda') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Odogbolu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ogun Waterside') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Remo North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Shagamu') on conflict (state_id, name) do nothing;

  -- State: Ondo
  insert into public.states (name, code) values ('Ondo', 'ON')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Ondo'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Akoko North-East') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Akoko North-West') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Akoko South-West') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Akoko South-East') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Akure North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Akure South') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ese Odo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Idanre') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ifedore') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ilaje') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ile Oluji/Okeigbo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Irele') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Odigbo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Okitipupa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ondo East') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ondo West') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ose') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Owo') on conflict (state_id, name) do nothing;

  -- State: Osun
  insert into public.states (name, code) values ('Osun', 'OS')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Osun'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Atakunmosa East') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Atakunmosa West') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Aiyedaade') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Aiyedire') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Boluwaduro') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Boripe') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ede North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ede South') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ife Central') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ife East') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ife North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ife South') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Egbedore') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ejigbo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ifedayo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ifelodun') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ila') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ilesa East') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ilesa West') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Irepodun') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Irewole') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Isokan') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Iwo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Obokun') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Odo Otin') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ola Oluwa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Olorunda') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Oriade') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Orolu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Osogbo') on conflict (state_id, name) do nothing;

  -- State: Oyo
  insert into public.states (name, code) values ('Oyo', 'OY')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Oyo'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Afijio') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Akinyele') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Atiba') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Atisbo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Egbeda') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ibadan North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ibadan North-East') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ibadan North-West') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ibadan South-East') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ibadan South-West') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ibarapa Central') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ibarapa East') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ibarapa North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Iddo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Irepo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Iseyin') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Itesiwaju') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Iwajowa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kajola') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Lagelu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ogbomosho North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ogbomosho South') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ogo Oluwa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Olorunsogo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Oluyole') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ona Ara') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Orelope') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ori Ire') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Oyo East') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Oyo West') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Saki East') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Saki West') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Surulere') on conflict (state_id, name) do nothing;

  -- State: Plateau
  insert into public.states (name, code) values ('Plateau', 'PL')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Plateau'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Bokkos') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Barkin Ladi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Bassa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Jos East') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Jos North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Jos South') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kanam') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kanke') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Langtang South') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Langtang North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Mangu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Mikang') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Pankshin') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Qua''an Pan') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Riyom') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Shendam') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Wase') on conflict (state_id, name) do nothing;

  -- State: Rivers
  insert into public.states (name, code) values ('Rivers', 'RI')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Rivers'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Abua/Odual') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ahoada East') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ahoada West') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Akuku-Toru') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Andoni') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Asari-Toru') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Bonny') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Degema') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Eleme') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Emuoha') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Etche') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Gokana') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ikwerre') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Khana') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Obio/Akpor') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ogba/Egbema/Ndoni') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ogu/Bolo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Okrika') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Omuma') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Opobo/Nkoro') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Oyigbo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Port Harcourt') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Tai') on conflict (state_id, name) do nothing;

  -- State: Sokoto
  insert into public.states (name, code) values ('Sokoto', 'SO')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Sokoto'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Binji') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Bodinga') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Dange Shuni') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Gada') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Goronyo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Gudu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Gwadabawa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Illela') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Isa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kebbe') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kware') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Rabah') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Sabon Birni') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Shagari') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Silame') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Sokoto North') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Sokoto South') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Tambuwal') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Tangaza') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Tureta') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Wamako') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Wurno') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Yabo') on conflict (state_id, name) do nothing;

  -- State: Taraba
  insert into public.states (name, code) values ('Taraba', 'TA')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Taraba'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Ardo Kola') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Bali') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Donga') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Gashaka') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Gassol') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ibi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Jalingo') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Karim Lamido') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kumi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Lau') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Sardauna') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Takum') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Ussa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Wukari') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Yorro') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Zing') on conflict (state_id, name) do nothing;

  -- State: Yobe
  insert into public.states (name, code) values ('Yobe', 'YO')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Yobe'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Bade') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Bursari') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Damaturu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Fika') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Fune') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Geidam') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Gujba') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Gulani') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Jakusko') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Karasuwa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Machina') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Nangere') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Nguru') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Potiskum') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Tarmuwa') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Yunusari') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Yusufari') on conflict (state_id, name) do nothing;

  -- State: Zamfara
  insert into public.states (name, code) values ('Zamfara', 'ZA')
  on conflict (name) do update set code = EXCLUDED.code
  returning id into s_id;
  if s_id is null then select id into s_id from public.states where name = 'Zamfara'; end if;

  insert into public.lgas (state_id, name) values (s_id, 'Anka') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Bakura') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Birnin Magaji/Kiyaw') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Bukkuyum') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Bungudu') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Gummi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Gusau') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Kaura Namoda') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Maradun') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Maru') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Shinkafi') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Talata Mafara') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Chafe') on conflict (state_id, name) do nothing;
  insert into public.lgas (state_id, name) values (s_id, 'Zurmi') on conflict (state_id, name) do nothing;

end $$;
