-- ============================================================
-- Modules contextuels : consentement et données
-- ============================================================

-- Table de consentement par module et par utilisateur
create table if not exists public.contextual_consent (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  module      text not null,
  enabled     boolean not null default false,
  granted_at  timestamptz,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, module),
  constraint module_valid check (module in ('sleep', 'activity', 'screen_time'))
);

create index if not exists contextual_consent_user_idx
  on public.contextual_consent(user_id);

-- Table des données contextuelles (une ligne par utilisateur par jour)
-- Toutes les colonnes modules sont nullables : une ligne peut n'avoir
-- que les données des modules activés.
create table if not exists public.contextual_entries (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  entry_date            date not null,

  -- Sommeil (source : HealthKit / Health Connect)
  sleep_duration_min    smallint,
  sleep_bedtime         time,
  sleep_wake_time       time,
  sleep_quality         smallint check (sleep_quality between 1 and 5),
  sleep_source          text check (sleep_source is null or sleep_source in ('healthkit', 'health_connect', 'manual')),

  -- Activité physique (source : HealthKit / Health Connect)
  activity_steps        integer,
  activity_active_min   smallint,
  activity_training_min smallint,
  activity_level        text check (activity_level in ('sedentary', 'light', 'moderate', 'active')),
  activity_source       text check (activity_source is null or activity_source in ('healthkit', 'health_connect', 'manual')),

  -- Temps d'écran (saisie manuelle pour MVP)
  screen_total_min      smallint,
  screen_source         text check (screen_source is null or screen_source in ('manual')),

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  unique (user_id, entry_date),

  constraint sleep_duration_range check (sleep_duration_min is null or sleep_duration_min between 0 and 1440),
  constraint activity_steps_range check (activity_steps is null or activity_steps between 0 and 100000),
  constraint activity_active_min_range check (activity_active_min is null or activity_active_min between 0 and 1440),
  constraint activity_training_min_range check (activity_training_min is null or activity_training_min between 0 and 1440),
  constraint screen_total_min_range check (screen_total_min is null or screen_total_min between 0 and 1440)
);

create index if not exists contextual_entries_user_date_idx
  on public.contextual_entries(user_id, entry_date desc);

-- Empêche l'écriture de données contextuelles sans consentement actif.
-- La mise à NULL reste autorisée pour permettre la révocation + suppression.
create or replace function public.require_contextual_consent()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (
    tg_op = 'INSERT' or (
      tg_op = 'UPDATE' and (
        NEW.sleep_duration_min is distinct from OLD.sleep_duration_min
        or NEW.sleep_bedtime is distinct from OLD.sleep_bedtime
        or NEW.sleep_wake_time is distinct from OLD.sleep_wake_time
        or NEW.sleep_quality is distinct from OLD.sleep_quality
        or NEW.sleep_source is distinct from OLD.sleep_source
      )
    )
  ) and (
    NEW.sleep_duration_min is not null
    or NEW.sleep_bedtime is not null
    or NEW.sleep_wake_time is not null
    or NEW.sleep_quality is not null
    or NEW.sleep_source is not null
  ) and not exists (
    select 1 from public.contextual_consent
    where user_id = NEW.user_id and module = 'sleep' and enabled = true
  ) then
    raise exception 'Missing sleep consent' using errcode = '42501';
  end if;

  if (
    tg_op = 'INSERT' or (
      tg_op = 'UPDATE' and (
        NEW.activity_steps is distinct from OLD.activity_steps
        or NEW.activity_active_min is distinct from OLD.activity_active_min
        or NEW.activity_training_min is distinct from OLD.activity_training_min
        or NEW.activity_level is distinct from OLD.activity_level
        or NEW.activity_source is distinct from OLD.activity_source
      )
    )
  ) and (
    NEW.activity_steps is not null
    or NEW.activity_active_min is not null
    or NEW.activity_training_min is not null
    or NEW.activity_level is not null
    or NEW.activity_source is not null
  ) and not exists (
    select 1 from public.contextual_consent
    where user_id = NEW.user_id and module = 'activity' and enabled = true
  ) then
    raise exception 'Missing activity consent' using errcode = '42501';
  end if;

  if (
    tg_op = 'INSERT' or (
      tg_op = 'UPDATE' and (
        NEW.screen_total_min is distinct from OLD.screen_total_min
        or NEW.screen_source is distinct from OLD.screen_source
      )
    )
  ) and (
    NEW.screen_total_min is not null
    or NEW.screen_source is not null
  ) and not exists (
    select 1 from public.contextual_consent
    where user_id = NEW.user_id and module = 'screen_time' and enabled = true
  ) then
    raise exception 'Missing screen time consent' using errcode = '42501';
  end if;

  return NEW;
end;
$$;

create trigger contextual_consent_required
  before insert or update on public.contextual_entries
  for each row execute function public.require_contextual_consent();

create trigger contextual_consent_updated_at
  before update on public.contextual_consent
  for each row execute function public.set_updated_at();

create trigger contextual_entries_updated_at
  before update on public.contextual_entries
  for each row execute function public.set_updated_at();

-- ============================================================
-- RLS contextual_consent
-- ============================================================
alter table public.contextual_consent enable row level security;

create policy "contextual_consent_select_own" on public.contextual_consent
  for select using (auth.uid() = user_id);

create policy "contextual_consent_insert_own" on public.contextual_consent
  for insert with check (auth.uid() = user_id);

create policy "contextual_consent_update_own" on public.contextual_consent
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "contextual_consent_delete_own" on public.contextual_consent
  for delete using (auth.uid() = user_id);

-- ============================================================
-- RLS contextual_entries
-- ============================================================
alter table public.contextual_entries enable row level security;

create policy "contextual_entries_select_own" on public.contextual_entries
  for select using (auth.uid() = user_id);

create policy "contextual_entries_insert_own" on public.contextual_entries
  for insert with check (auth.uid() = user_id);

create policy "contextual_entries_update_own" on public.contextual_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "contextual_entries_delete_own" on public.contextual_entries
  for delete using (auth.uid() = user_id);
