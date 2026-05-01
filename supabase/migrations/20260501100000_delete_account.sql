-- ============================================================
-- Migration : suppression de compte (RGPD)
-- ============================================================
-- Fonction appelable par le client (via supabase.rpc) qui supprime
-- toutes les données de l'utilisateur connecté, y compris son entrée
-- dans auth.users. Requiert SECURITY DEFINER car auth.users n'est pas
-- accessible aux utilisateurs normaux.
-- ============================================================

CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calling_user_id UUID;
BEGIN
  calling_user_id := auth.uid();

  IF calling_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Suppression des données applicatives (ordre important pour les FK)
  DELETE FROM public.mood_entries WHERE user_id = calling_user_id;
  DELETE FROM public.profiles WHERE id = calling_user_id;

  -- Suppression du compte auth (nécessite SECURITY DEFINER)
  DELETE FROM auth.users WHERE id = calling_user_id;
END;
$$;

-- Accorder l'exécution uniquement aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;
-- Révoquer explicitement pour les anonymes
REVOKE EXECUTE ON FUNCTION delete_user_account() FROM anon;

COMMENT ON FUNCTION delete_user_account() IS
  'Suppression RGPD : efface mood_entries, profiles et auth.users pour '
  'l''utilisateur appelant. Nécessite SECURITY DEFINER pour toucher auth.users.';
