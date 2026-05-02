-- ============================================================
-- Fix : profiles_insert_own ne bloquait pas premium=true côté client
-- Un compte authentifié sans ligne profiles (trigger raté, import
-- manuel, etc.) pouvait s'insérer avec premium=true.
-- ============================================================

drop policy if exists "profiles_insert_own" on public.profiles;

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id and premium = false);
