-- Villa Leads — schemat bazy (Etapy 1–6)
-- Wklej całość w Supabase → SQL Editor → New query → Run.
-- Skrypt można bezpiecznie uruchomić ponownie.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,

  name text not null,
  lead_type text not null default 'management_company'
    check (lead_type in ('management_company', 'owner')),
  location text,
  website text,
  domain text, -- znormalizowana domena www (bez "www."), do wykrywania duplikatów
  email text,
  phone text,
  listing_url text,
  property_count integer check (property_count is null or property_count >= 0),
  has_video text not null default 'unknown'
    check (has_video in ('yes', 'no', 'unknown')),
  notes text,

  stage text not null default 'new'
    check (stage in (
      'new', 'verified', 'demo_done', 'sent', 'followup_1', 'followup_2',
      'replied', 'client', 'rejected'
    )),
  stage_changed_at timestamptz not null default now(),
  sent_at timestamptz,
  followup1_at timestamptz,
  followup2_at timestamptz,

  do_not_contact boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Jedna domena = jeden lead (dla danego użytkownika)
create unique index if not exists leads_user_domain_key
  on public.leads (user_id, domain)
  where domain is not null;

create index if not exists leads_user_stage_idx on public.leads (user_id, stage);

-- Automatyczna aktualizacja updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- Bezpieczeństwo: każdy zalogowany użytkownik widzi i zmienia tylko swoje leady
alter table public.leads enable row level security;

drop policy if exists "leads_select_own" on public.leads;
create policy "leads_select_own" on public.leads
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "leads_insert_own" on public.leads;
create policy "leads_insert_own" on public.leads
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "leads_update_own" on public.leads;
create policy "leads_update_own" on public.leads
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "leads_delete_own" on public.leads;
create policy "leads_delete_own" on public.leads
  for delete to authenticated using ((select auth.uid()) = user_id);

-- =====================================================================
-- Etap 2: link do demo, Ustawienia (moje dane + stopka), zapisane maile
-- =====================================================================

alter table public.leads add column if not exists demo_url text;

create table if not exists public.settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  sender_name text,
  company_name text,
  email text,
  phone text,
  website text,
  portfolio_url text,
  postal_address text, -- CAN-SPAM wymaga fizycznego adresu pocztowego
  unsubscribe_text text,
  footer text, -- własna stopka; pusta = budowana automatycznie z danych powyżej
  offer_text text, -- dodatkowy opis oferty dla Claude
  extra_instructions text, -- dodatkowe wskazówki stylu dla Claude
  updated_at timestamptz not null default now()
);

drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

alter table public.settings enable row level security;

drop policy if exists "settings_all_own" on public.settings;
create policy "settings_all_own" on public.settings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table if not exists public.lead_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  kind text not null check (kind in ('initial', 'followup_1', 'followup_2')),
  subject text,
  body text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id, kind)
);

create index if not exists lead_messages_user_idx on public.lead_messages (user_id);

drop trigger if exists lead_messages_set_updated_at on public.lead_messages;
create trigger lead_messages_set_updated_at
  before update on public.lead_messages
  for each row execute function public.set_updated_at();

alter table public.lead_messages enable row level security;

drop policy if exists "lead_messages_all_own" on public.lead_messages;
create policy "lead_messages_all_own" on public.lead_messages
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- =====================================================================
-- Etap 3: wzbogacanie (pobieranie publicznej strony firmy)
-- =====================================================================

alter table public.leads add column if not exists enriched_at timestamptz;
alter table public.leads add column if not exists enrich_note text;

-- =====================================================================
-- Etap 4: lista „Nie kontaktować”
-- =====================================================================

alter table public.leads add column if not exists do_not_contact_at timestamptz;

-- =====================================================================
-- Etap 5: wyszukiwarka Google Places
-- =====================================================================

alter table public.leads add column if not exists google_place_id text;
alter table public.leads add column if not exists google_rating numeric(2, 1);
alter table public.leads add column if not exists google_reviews integer;

create unique index if not exists leads_user_place_key
  on public.leads (user_id, google_place_id)
  where google_place_id is not null;

-- =====================================================================
-- Etap 6: pisanie maili przez Claude API (fragment strony firmy jako kontekst)
-- =====================================================================

alter table public.leads add column if not exists site_excerpt text;

-- Uprawnienia dla zalogowanego użytkownika (dostęp i tak ograniczają reguły RLS powyżej)
grant select, insert, update, delete on public.leads, public.settings, public.lead_messages
  to authenticated;
