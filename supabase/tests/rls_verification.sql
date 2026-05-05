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
  user_a_context UUID;
  user_b_context UUID;
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

  -- 4. Consentements et données contextuelles pour les deux utilisateurs
  INSERT INTO public.contextual_consent (user_id, module, enabled, granted_at)
  VALUES
    (user_a_id, 'sleep', true, now()),
    (user_a_id, 'activity', true, now()),
    (user_b_id, 'sleep', true, now()),
    (user_b_id, 'activity', true, now());

  INSERT INTO public.contextual_entries (
    user_id, entry_date,
    sleep_duration_min, sleep_bedtime, sleep_wake_time, sleep_quality, sleep_source,
    activity_steps, activity_active_min, activity_training_min, activity_level, activity_source
  )
  VALUES (
    user_a_id, CURRENT_DATE,
    420, '23:15', '07:00', 4, 'healthkit',
    8200, 82, 20, 'moderate', 'healthkit'
  )
  RETURNING id INTO user_a_context;

  INSERT INTO public.contextual_entries (
    user_id, entry_date,
    sleep_duration_min, sleep_bedtime, sleep_wake_time, sleep_quality, sleep_source,
    activity_steps, activity_active_min, activity_training_min, activity_level, activity_source
  )
  VALUES (
    user_b_id, CURRENT_DATE - 1,
    360, '00:10', '06:30', 3, 'health_connect',
    2500, 25, 0, 'sedentary', 'health_connect'
  )
  RETURNING id INTO user_b_context;

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
  -- WITH CHECK lève une exception 42501 (pas un blocage silencieux) — on la capture.
  SET LOCAL role TO authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', user_a_id::text, 'role', 'authenticated')::text, true);
  BEGIN
    UPDATE public.mood_entries SET user_id = user_b_id WHERE id = user_a_entry;
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
  RESET role;
  SELECT COUNT(*) INTO result_count
  FROM public.mood_entries WHERE id = user_a_entry AND user_id = user_b_id;
  ASSERT result_count = 0,
    'ÉCHEC TEST 5 : user_a a pu transférer son entrée vers user_b (WITH CHECK manquant)';
  RAISE NOTICE 'TEST 5 PASSÉ : transfert user_id bloqué (WITH CHECK)';

  -- TEST 6 : user_a ne peut pas insérer une entrée pour user_b
  SET LOCAL role TO authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', user_a_id::text, 'role', 'authenticated')::text, true);
  BEGIN
    INSERT INTO public.mood_entries (user_id, mood, energy, stress, tags, entry_date)
    VALUES (user_b_id, 2, 2, 4, '{}', CURRENT_DATE - 2);
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
  RESET role;
  SELECT COUNT(*) INTO result_count
  FROM public.mood_entries WHERE user_id = user_b_id AND entry_date = CURRENT_DATE - 2;
  ASSERT result_count = 0,
    'ÉCHEC TEST 6 : user_a a pu insérer une entrée pour user_b';
  RAISE NOTICE 'TEST 6 PASSÉ : insertion croisée mood_entries bloquée';

  -- TEST 7 : user_a ne peut pas lire le profil de user_b
  SET LOCAL role TO authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', user_a_id::text, 'role', 'authenticated')::text, true);
  SELECT COUNT(*) INTO result_count FROM public.profiles WHERE id = user_b_id;
  ASSERT result_count = 0,
    'ÉCHEC TEST 7 : user_a peut lire le profil de user_b';
  RAISE NOTICE 'TEST 7 PASSÉ : lecture profil croisée bloquée';

  -- TEST 8 : user_a ne peut pas s'auto-attribuer premium
  -- Le profil de user_a existe (fixture) → pas de faux positif possible
  UPDATE public.profiles SET premium = true WHERE id = user_a_id;
  RESET role;
  SELECT COUNT(*) INTO result_count
  FROM public.profiles WHERE id = user_a_id AND premium = true;
  ASSERT result_count = 0,
    'ÉCHEC TEST 8 : user_a a pu s''auto-attribuer premium=true';
  RAISE NOTICE 'TEST 8 PASSÉ : auto-attribution premium bloquée';

  -- TEST 9 : service_role peut mettre à jour premium via set_user_premium()
  RESET role;
  PERFORM set_config('request.jwt.claims',
    json_build_object('role', 'service_role')::text, true);
  PERFORM public.set_user_premium(user_a_id, true);
  SELECT COUNT(*) INTO result_count
  FROM public.profiles WHERE id = user_a_id AND premium = true;
  ASSERT result_count = 1,
    'ÉCHEC TEST 9 : set_user_premium() n''a pas mis à jour premium';
  RAISE NOTICE 'TEST 9 PASSÉ : set_user_premium() fonctionne en service_role';

  -- TEST 10 : user_a ne peut pas lire les consentements contextuels de user_b
  SET LOCAL role TO authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', user_a_id::text, 'role', 'authenticated')::text, true);
  SELECT COUNT(*) INTO result_count
  FROM public.contextual_consent WHERE user_id = user_b_id;
  ASSERT result_count = 0,
    'ÉCHEC TEST 10 : user_a peut lire les consentements de user_b';
  RAISE NOTICE 'TEST 10 PASSÉ : lecture croisée contextual_consent bloquée';

  -- TEST 11 : user_a ne peut pas lire les données contextuelles de user_b
  SELECT COUNT(*) INTO result_count
  FROM public.contextual_entries WHERE user_id = user_b_id;
  ASSERT result_count = 0,
    'ÉCHEC TEST 11 : user_a peut lire les données contextuelles de user_b';
  RAISE NOTICE 'TEST 11 PASSÉ : lecture croisée contextual_entries bloquée';

  -- TEST 12 : user_a peut lire ses propres données contextuelles
  SELECT COUNT(*) INTO result_count
  FROM public.contextual_entries WHERE user_id = user_a_id;
  ASSERT result_count = 1,
    'ÉCHEC TEST 12 : user_a ne peut pas lire ses propres données contextuelles';
  RAISE NOTICE 'TEST 12 PASSÉ : lecture propre contextual_entries autorisée';

  -- TEST 13 : user_a ne peut pas modifier les données contextuelles de user_b
  UPDATE public.contextual_entries SET activity_steps = 9000 WHERE id = user_b_context;
  RESET role;
  SELECT COUNT(*) INTO result_count
  FROM public.contextual_entries WHERE id = user_b_context AND activity_steps = 9000;
  ASSERT result_count = 0,
    'ÉCHEC TEST 13 : user_a a pu modifier les données contextuelles de user_b';
  RAISE NOTICE 'TEST 13 PASSÉ : modification croisée contextual_entries bloquée';

  -- TEST 14 : user_a ne peut pas supprimer les données contextuelles de user_b
  SET LOCAL role TO authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', user_a_id::text, 'role', 'authenticated')::text, true);
  DELETE FROM public.contextual_entries WHERE id = user_b_context;
  RESET role;
  SELECT COUNT(*) INTO result_count
  FROM public.contextual_entries WHERE id = user_b_context;
  ASSERT result_count = 1,
    'ÉCHEC TEST 14 : user_a a pu supprimer les données contextuelles de user_b';
  RAISE NOTICE 'TEST 14 PASSÉ : suppression croisée contextual_entries bloquée';

  -- TEST 15 : user_a ne peut pas transférer ses données contextuelles vers user_b
  SET LOCAL role TO authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', user_a_id::text, 'role', 'authenticated')::text, true);
  BEGIN
    UPDATE public.contextual_entries SET user_id = user_b_id WHERE id = user_a_context;
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
  RESET role;
  SELECT COUNT(*) INTO result_count
  FROM public.contextual_entries WHERE id = user_a_context AND user_id = user_b_id;
  ASSERT result_count = 0,
    'ÉCHEC TEST 15 : user_a a pu transférer une ligne contextual_entries vers user_b';
  RAISE NOTICE 'TEST 15 PASSÉ : transfert contextual_entries bloqué';

  -- TEST 16 : sans consentement screen_time, user_a ne peut pas écrire le temps d'écran
  SET LOCAL role TO authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', user_a_id::text, 'role', 'authenticated')::text, true);
  BEGIN
    UPDATE public.contextual_entries
    SET screen_total_min = 180, screen_source = 'manual'
    WHERE id = user_a_context;
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
  RESET role;
  SELECT COUNT(*) INTO result_count
  FROM public.contextual_entries
  WHERE id = user_a_context AND screen_total_min IS NOT NULL;
  ASSERT result_count = 0,
    'ÉCHEC TEST 16 : user_a a pu écrire screen_time sans consentement actif';
  RAISE NOTICE 'TEST 16 PASSÉ : écriture screen_time sans consentement bloquée';

  RAISE NOTICE '✅ Tous les tests RLS sont passés (16/16).';

EXCEPTION WHEN OTHERS THEN
  RESET role;
  RAISE;
END;
$$;

-- Rollback systématique : aucune fixture ne persiste en base.
ROLLBACK;
