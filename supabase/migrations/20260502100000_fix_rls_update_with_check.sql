-- ============================================================
-- Fix : RLS UPDATE sans WITH CHECK sur profiles et mood_entries
-- Sans WITH CHECK, un utilisateur pouvait modifier user_id/id
-- d'une ligne qu'il possède pour la transférer vers un autre compte.
-- ============================================================

-- profiles
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- mood_entries
drop policy if exists "mood_entries_update_own" on public.mood_entries;
create policy "mood_entries_update_own" on public.mood_entries
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
