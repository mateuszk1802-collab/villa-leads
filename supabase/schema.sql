-- Villa Leads — schemat bazy (Etap 1)
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
