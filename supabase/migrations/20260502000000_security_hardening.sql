-- ============================================================
-- Migration : durcissement sécurité — privilèges fonctions + premium
-- ============================================================

-- 1. Révoquer PUBLIC sur toutes les fonctions SECURITY DEFINER
--    PostgreSQL accorde EXECUTE à PUBLIC par défaut — on rend explicite.
-- ------------------------------------------------------------
REVOKE ALL ON FUNCTION public.prevent_premium_update() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_tags(TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC;

-- validate_tags est appelée via CHECK constraint — les rôles qui insèrent
-- des données doivent pouvoir l'exécuter.
GRANT EXECUTE ON FUNCTION public.validate_tags(TEXT[]) TO authenticated, anon;

-- delete_user_account reste accessible aux utilisateurs authentifiés uniquement.
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

-- 2. Corriger prevent_premium_update pour autoriser service_role
--    Le trigger précédent bloquait TOUT update de premium, y compris
--    les webhooks RevenueCat via Edge Function avec service_role.
--    On inspecte le claim JWT : seul authenticated est bloqué.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION prevent_premium_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role TEXT;
BEGIN
  -- Lire le rôle depuis les claims JWT PostgREST.
  -- NULL = appel direct admin/postgres (autorisé).
  -- 'authenticated' = client normal (bloqué).
  -- 'service_role' = Edge Function ou webhook (autorisé).
  BEGIN
    jwt_role := current_setting('request.jwt.claims', true)::json->>'role';
  EXCEPTION WHEN OTHERS THEN
    jwt_role := NULL;
  END;

  IF jwt_role = 'authenticated' AND NEW.premium IS DISTINCT FROM OLD.premium THEN
    NEW.premium := OLD.premium;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_premium_update() FROM PUBLIC;

-- 3. Fonction admin dédiée pour activer/désactiver premium
--    Appelée uniquement par une Edge Function (service_role).
--    Un client normal ne peut pas l'invoquer.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_user_premium(
  target_user_id UUID,
  premium_value  BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role TEXT;
BEGIN
  BEGIN
    jwt_role := current_setting('request.jwt.claims', true)::json->>'role';
  EXCEPTION WHEN OTHERS THEN
    jwt_role := NULL;
  END;

  -- Autoriser uniquement service_role et appels admin directs (jwt_role IS NULL)
  IF jwt_role IS NOT NULL AND jwt_role != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET premium = premium_value, updated_at = now()
  WHERE id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_premium(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_user_premium(UUID, BOOLEAN) TO service_role;

COMMENT ON FUNCTION public.set_user_premium IS
  'Réservée aux webhooks RevenueCat via Edge Function (service_role). '
  'Les clients authentifiés ne peuvent pas l''appeler.';
