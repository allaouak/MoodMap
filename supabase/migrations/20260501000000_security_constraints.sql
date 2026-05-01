-- ============================================================
-- Migration : contraintes de sécurité et verrouillage premium
-- ============================================================

-- 1. Verrouiller premium côté base
--    Un trigger BEFORE UPDATE réinitialise premium à sa valeur existante
--    quelle que soit la valeur envoyée par le client.
--    Seule une Edge Function avec service_role peut modifier premium.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION prevent_premium_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.premium := OLD.premium;
  RETURN NEW;
END;
$$;

CREATE TRIGGER lock_premium_field
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_premium_update();

-- 2. Contraintes de validation sur profiles
-- ------------------------------------------------------------
ALTER TABLE public.profiles
  ADD CONSTRAINT display_name_length
    CHECK (display_name IS NULL OR char_length(display_name) <= 50),
  ADD CONSTRAINT timezone_length
    CHECK (char_length(timezone) <= 100),
  ADD CONSTRAINT avatar_url_length
    CHECK (avatar_url IS NULL OR char_length(avatar_url) <= 500);

-- 3. Fonction de validation des tags (nécessaire car CHECK n'accepte pas les sous-requêtes)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_tags(tags TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tags LOOP
    IF char_length(t) = 0 OR char_length(t) > 30 THEN
      RETURN FALSE;
    END IF;
  END LOOP;
  RETURN TRUE;
END;
$$;

-- 4. Contraintes de validation sur mood_entries
-- ------------------------------------------------------------
ALTER TABLE public.mood_entries
  -- Note : max 500 caractères (cohérent avec la validation client)
  ADD CONSTRAINT note_max_length
    CHECK (note IS NULL OR char_length(note) <= 500),
  -- Tags : max 10 tags par entrée
  ADD CONSTRAINT tags_max_count
    CHECK (array_length(tags, 1) IS NULL OR array_length(tags, 1) <= 10),
  -- Chaque tag : max 30 caractères, non vide — via fonction IMMUTABLE
  ADD CONSTRAINT tag_item_length
    CHECK (validate_tags(tags));

-- 4. Commentaires explicatifs pour les futurs développeurs
-- ------------------------------------------------------------
COMMENT ON FUNCTION prevent_premium_update() IS
  'Empêche tout client de modifier le champ premium via API REST. '
  'La mise à jour premium doit passer par une Edge Function avec service_role '
  'déclenchée par webhook RevenueCat.';

COMMENT ON TRIGGER lock_premium_field ON public.profiles IS
  'Verrouille le champ premium — toute tentative de mise à jour est silencieusement ignorée.';
