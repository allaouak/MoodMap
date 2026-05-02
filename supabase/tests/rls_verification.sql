-- ============================================================
-- Tests RLS automatisés — MoodMap
-- Exécuter en tant que postgres dans le SQL Editor Supabase.
-- Le ROLLBACK final garantit qu'aucune donnée ne persiste.
-- ============================================================

BEGIN;

DO $$
DECLARE
  user_a_id      UUID := gen_random_uuid();
  user_b_id      UUID := gen_random_uuid();
  user_a_entry   UUID;
  user_b_entry   UUID;
  result_count   INT;
BEGIN

  -- ── Fixtures ──────────────────────────────────────────────────────────────
  -- 1. auth.users en premier (profiles.id → auth.users.id)
  INSERT INTO auth.users (
    id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin
  ) VALUES
    (user_a_id, 'authenticated', 'authenticated',
     'rls_test_a@internal.test', '',
     now(), now(), now(), '{}', '{}', false),
    (user_b_id, 'authenticated', 'authenticated',
     'rls_test_b@internal.test', '',
     now(), now(), now(), '{}', '{}', false);

  -- 2. Profils pour les deux utilisateurs (mood_entries.user_id → profiles.id)
  -- ON CONFLICT car le trigger handle_new_user crée déjà le profil à l'insert auth.users
  INSERT INTO public.profiles (id, timezone, premium)
  VALUES
    (user_a_id, 'Europe/Paris', false),
    (user_b_id, 'Europe/Paris', false)
  ON CONFLICT (id) DO UPDATE SET timezone = EXCLUDED.timezone, premium = EXCLUDED.premium;

  -- 3. Une entrée d'humeur par utilisateur
  INSERT INTO public.mood_entries (user_id, mood, energy, stress, tags, entry_date)
  VALUES (user_a_id, 4, 4, 2, '{}', CURRENT_DATE)
  RETURNING id INTO user_a_entry;

  INSERT INTO public.mood_entries (user_id, mood, energy, stress, tags, entry_date)
  VALUES (user_b_id, 3, 3, 3, '{}', CURRENT_DATE - 1)
  RETURNING id INTO user_b_entry;

  -- ── Simulation user_a ─────────────────────────────────────────────────────
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', user_a_id::text, 'role', 'authenticated')::text, true);
  SET LOCAL role TO authenticated;

  -- TEST 1 : user_a ne peut pas lire les entrées de user_b
  SELECT COUNT(*) INTO result_count
  FROM public.mood_entries WHERE user_id = user_b_id;
  ASSERT result_count = 0,
    'ÉCHEC TEST 1 : user_a peut lire les entrées de user_b (' || result_count || ' lignes)';
  RAISE NOTICE 'TEST 1 PASSÉ : lecture croisée mood_entries bloquée';

  -- TEST 2 : user_a peut lire ses propres entrées
  SELECT COUNT(*) INTO result_count
  FROM public.mood_entries WHERE user_id = user_a_id;
  ASSERT result_count = 1,
    'ÉCHEC TEST 2 : user_a ne peut pas lire ses propres entrées';
  RAISE NOTICE 'TEST 2 PASSÉ : lecture propre mood_entries autorisée';

  -- TEST 3 : user_a ne peut pas modifier les entrées de user_b
  UPDATE public.mood_entries SET mood = 5 WHERE id = user_b_entry;
  RESET role;
  SELECT COUNT(*) INTO result_count
  FROM public.mood_entries WHERE id = user_b_entry AND mood = 5;
  ASSERT result_count = 0,
    'ÉCHEC TEST 3 : user_a a pu modifier une entrée de user_b';
  RAISE NOTICE 'TEST 3 PASSÉ : modification croisée mood_entries bloquée';

  -- TEST 4 : user_a ne peut pas supprimer les entrées de user_b
  SET LOCAL role TO authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', user_a_id::text, 'role', 'authenticated')::text, true);
  DELETE FROM public.mood_entries WHERE id = user_b_entry;
  RESET role;
  SELECT COUNT(*) INTO result_count
  FROM public.mood_entries WHERE id = user_b_entry;
  ASSERT result_count = 1,
    'ÉCHEC TEST 4 : user_a a pu supprimer une entrée de user_b';
  RAISE NOTICE 'TEST 4 PASSÉ : suppression croisée mood_entries bloquée';

  -- TEST 5 : user_a ne peut pas changer le user_id d'une entrée (WITH CHECK)
  -- Régression : bug corrigé dans migration 20260502100000
  SET LOCAL role TO authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', user_a_id::text, 'role', 'authenticated')::text, true);
  UPDATE public.mood_entries SET user_id = user_b_id WHERE id = user_a_entry;
  RESET role;
  SELECT COUNT(*) INTO result_count
  FROM public.mood_entries WHERE id = user_a_entry AND user_id = user_b_id;
  ASSERT result_count = 0,
    'ÉCHEC TEST 5 : user_a a pu transférer son entrée vers user_b (WITH CHECK manquant)';
  RAISE NOTICE 'TEST 5 PASSÉ : transfert user_id bloqué (WITH CHECK)';

  -- TEST 6 : user_a ne peut pas lire le profil de user_b
  SET LOCAL role TO authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', user_a_id::text, 'role', 'authenticated')::text, true);
  SELECT COUNT(*) INTO result_count FROM public.profiles WHERE id = user_b_id;
  ASSERT result_count = 0,
    'ÉCHEC TEST 6 : user_a peut lire le profil de user_b';
  RAISE NOTICE 'TEST 6 PASSÉ : lecture profil croisée bloquée';

  -- TEST 7 : user_a ne peut pas s'auto-attribuer premium
  -- Le profil de user_a existe (fixture) → pas de faux positif possible
  UPDATE public.profiles SET premium = true WHERE id = user_a_id;
  RESET role;
  SELECT COUNT(*) INTO result_count
  FROM public.profiles WHERE id = user_a_id AND premium = true;
  ASSERT result_count = 0,
    'ÉCHEC TEST 7 : user_a a pu s''auto-attribuer premium=true';
  RAISE NOTICE 'TEST 7 PASSÉ : auto-attribution premium bloquée';

  -- TEST 8 : service_role peut mettre à jour premium via set_user_premium()
  RESET role;
  PERFORM public.set_user_premium(user_a_id, true);
  SELECT COUNT(*) INTO result_count
  FROM public.profiles WHERE id = user_a_id AND premium = true;
  ASSERT result_count = 1,
    'ÉCHEC TEST 8 : set_user_premium() n''a pas mis à jour premium';
  RAISE NOTICE 'TEST 8 PASSÉ : set_user_premium() fonctionne en service_role';

  RAISE NOTICE '✅ Tous les tests RLS sont passés (8/8).';

EXCEPTION WHEN OTHERS THEN
  RESET role;
  RAISE;
END;
$$;

-- Rollback systématique : aucune fixture ne persiste en base.
ROLLBACK;
