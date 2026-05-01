-- ============================================================
-- Vérification manuelle des politiques RLS
-- À exécuter dans le SQL Editor de Supabase (en tant que postgres)
-- ============================================================
-- Ces requêtes simulent des accès en tant qu'utilisateur pour vérifier
-- que les RLS bloquent bien les accès non autorisés.
-- ============================================================

-- PRÉREQUIS : créer deux utilisateurs de test dans Supabase Auth,
-- puis remplacer les UUIDs ci-dessous.
-- user_a_id : l'utilisateur qui exécute les requêtes
-- user_b_id : l'utilisateur dont on tente d'accéder aux données

DO $$
DECLARE
  user_a_id UUID := 'REMPLACER_PAR_UUID_USER_A';
  user_b_id UUID := 'REMPLACER_PAR_UUID_USER_B';
  test_entry_id UUID;
  result_count INT;
BEGIN

  -- ============================================================
  -- Mise en place : insérer une entrée pour user_b (en service_role)
  -- ============================================================
  INSERT INTO public.mood_entries (user_id, mood, energy, stress, tags, entry_date)
  VALUES (user_b_id, 3, 3, 3, '{}', CURRENT_DATE - 1)
  RETURNING id INTO test_entry_id;

  INSERT INTO public.profiles (id, timezone)
  VALUES (user_b_id, 'Europe/Paris')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- Simulation : se connecter en tant que user_a
  -- ============================================================
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', user_a_id, 'role', 'authenticated')::text,
    true);
  SET LOCAL role = authenticated;

  -- TEST 1 : user_a ne peut pas lire les entrées de user_b
  SELECT COUNT(*) INTO result_count
  FROM public.mood_entries
  WHERE user_id = user_b_id;

  ASSERT result_count = 0,
    'ÉCHEC TEST 1 : user_a peut lire les entrées de user_b ('
    || result_count || ' lignes visibles)';
  RAISE NOTICE 'TEST 1 PASSÉ : lecture croisée bloquée';

  -- TEST 2 : user_a ne peut pas modifier les entrées de user_b
  UPDATE public.mood_entries SET mood = 5 WHERE id = test_entry_id;
  SELECT COUNT(*) INTO result_count
  FROM public.mood_entries
  WHERE id = test_entry_id AND mood = 5;

  ASSERT result_count = 0,
    'ÉCHEC TEST 2 : user_a a pu modifier une entrée de user_b';
  RAISE NOTICE 'TEST 2 PASSÉ : modification croisée bloquée';

  -- TEST 3 : user_a ne peut pas supprimer les entrées de user_b
  DELETE FROM public.mood_entries WHERE id = test_entry_id;
  SELECT COUNT(*) INTO result_count
  FROM public.mood_entries
  WHERE id = test_entry_id;
  -- On revient en service_role pour vérifier
  RESET role;
  SELECT COUNT(*) INTO result_count
  FROM public.mood_entries
  WHERE id = test_entry_id;

  ASSERT result_count = 1,
    'ÉCHEC TEST 3 : user_a a pu supprimer une entrée de user_b';
  RAISE NOTICE 'TEST 3 PASSÉ : suppression croisée bloquée';

  -- TEST 4 : user_a ne peut pas lire le profil de user_b
  SET LOCAL role = authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', user_a_id, 'role', 'authenticated')::text,
    true);
  SELECT COUNT(*) INTO result_count
  FROM public.profiles
  WHERE id = user_b_id;

  ASSERT result_count = 0,
    'ÉCHEC TEST 4 : user_a peut lire le profil de user_b';
  RAISE NOTICE 'TEST 4 PASSÉ : lecture profil croisée bloquée';

  -- TEST 5 : user_a ne peut pas s'auto-attribuer premium
  RESET role;
  SET LOCAL role = authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', user_a_id, 'role', 'authenticated')::text,
    true);
  UPDATE public.profiles SET premium = true WHERE id = user_a_id;

  RESET role;
  SELECT COUNT(*) INTO result_count
  FROM public.profiles
  WHERE id = user_a_id AND premium = true;

  ASSERT result_count = 0,
    'ÉCHEC TEST 5 : user_a a pu s''auto-attribuer premium=true';
  RAISE NOTICE 'TEST 5 PASSÉ : auto-attribution premium bloquée';

  -- ============================================================
  -- Nettoyage
  -- ============================================================
  RESET role;
  DELETE FROM public.mood_entries WHERE user_id = user_b_id;
  DELETE FROM public.profiles WHERE id = user_b_id;

  RAISE NOTICE '✅ Tous les tests RLS sont passés.';

EXCEPTION WHEN OTHERS THEN
  RESET role;
  DELETE FROM public.mood_entries WHERE user_id = user_b_id;
  DELETE FROM public.profiles WHERE id = user_b_id;
  RAISE;
END;
$$;
