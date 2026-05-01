-- ============================================================
-- MoodMap — Migration initiale
-- ============================================================

-- Extension UUID
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLE : profiles
-- ============================================================
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  timezone     text not null default 'Europe/Paris',
  premium      boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is 'Profils utilisateurs MoodMap';

-- Index
create index profiles_id_idx on public.profiles(id);

-- ============================================================
-- TABLE : mood_entries
-- ============================================================
create table if not exists public.mood_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  mood        smallint not null check (mood between 1 and 5),
  energy      smallint not null check (energy between 1 and 5),
  stress      smallint not null check (stress between 1 and 5),
  note        text,
  tags        text[] not null default '{}',
  entry_date  date not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- Une seule entrée par jour par utilisateur
  unique (user_id, entry_date)
);

comment on table public.mood_entries is 'Entrées de journal émotionnel quotidien';

-- Index pour requêtes fréquentes
create index mood_entries_user_date_idx on public.mood_entries(user_id, entry_date desc);
create index mood_entries_date_idx on public.mood_entries(entry_date);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.mood_entries enable row level security;

-- profiles : lecture et modification uniquement par le propriétaire
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- mood_entries : CRUD uniquement par le propriétaire
create policy "mood_entries_select_own" on public.mood_entries
  for select using (auth.uid() = user_id);

create policy "mood_entries_insert_own" on public.mood_entries
  for insert with check (auth.uid() = user_id);

create policy "mood_entries_update_own" on public.mood_entries
  for update using (auth.uid() = user_id);

create policy "mood_entries_delete_own" on public.mood_entries
  for delete using (auth.uid() = user_id);

-- ============================================================
-- TRIGGER : création automatique du profil après inscription
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, timezone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'display_name',
    coalesce(new.raw_user_meta_data ->> 'timezone', 'Europe/Paris')
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- TRIGGER : updated_at automatique
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger mood_entries_updated_at
  before update on public.mood_entries
  for each row execute function public.set_updated_at();
