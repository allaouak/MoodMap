# Modèle de sécurité MoodMap

## Périmètre

MoodMap traite des données émotionnelles personnelles. Toute décision de sécurité doit considérer la sensibilité de ce contenu, même en l'absence de classification médicale.

---

## Architecture de confiance

```
Client (Expo)
  └── HTTPS / TLS 1.2+
      └── Supabase PostgREST (rôle: authenticated)
          └── PostgreSQL + RLS
              └── auth.users (rôle: postgres / service_role uniquement)
```

Aucune donnée utilisateur n'est accessible sans JWT valide. Les politiques RLS garantissent l'isolation par `auth.uid()`.

---

## Authentification

- **Sessions** : stockées dans iOS Keychain via `expo-secure-store` (pas AsyncStorage).
- **JWT** : émis par Supabase Auth, durée de vie courte, auto-refresh activé.
- **Mots de passe** : hashés côté Supabase (bcrypt). Jamais transmis en clair.
- **Reset password** : flux PKCE — le code de récupération n'est valide qu'une fois.
- **Deep links** : acceptés uniquement depuis `moodmap://reset-password?code=<pkce>`. Format du code validé par regex avant `exchangeCodeForSession`.

---

## Autorisation (Row Level Security)

Toutes les tables applicatives ont RLS activé. Politiques en place :

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | Propriétaire | — | Propriétaire (sans `premium`) | — |
| `mood_entries` | Propriétaire | Propriétaire | Propriétaire | Propriétaire |

**Protection premium** : le champ `premium` ne peut pas être modifié par un client `authenticated`. Un trigger BEFORE UPDATE inspecte le claim JWT et annule silencieusement toute tentative. Seul `service_role` (webhook RevenueCat via Edge Function) peut modifier ce champ via `set_user_premium()`.

---

## Fonctions SQL privilégiées

| Fonction | SECURITY DEFINER | Accessible à |
|---|---|---|
| `prevent_premium_update()` | Oui (trigger) | Interne uniquement |
| `validate_tags()` | Non | `authenticated`, `anon` |
| `delete_user_account()` | Oui | `authenticated` |
| `set_user_premium()` | Oui | `service_role` uniquement |

`PUBLIC` est révoqué sur toutes les fonctions `SECURITY DEFINER`.

---

## Verrouillage local (Face ID / Touch ID)

- Activé par l'utilisateur dans les Réglages.
- Préférence stockée dans SecureStore (pas en mémoire seule).
- Vérifié **au démarrage** avant d'afficher le contenu des tabs.
- Activé automatiquement au passage en arrière-plan.
- La suppression de compte requiert une **confirmation par mot de passe** (re-authentification Supabase), indépendamment du verrou biométrique. Ce choix est délibéré : le mot de passe est un facteur « ce que tu sais » qui résiste à la coercition physique, contrairement à la biométrie.

---

## Notifications

- Notifications **locales uniquement** (trigger CALENDAR, aucun serveur push).
- Corps de notification neutre — ne révèle pas l'état émotionnel de l'utilisateur sur l'écran de verrouillage.

---

## Modèle de menace (résumé)

| Menace | Mitigation |
|---|---|
| Vol de session | SecureStore (Keychain iOS), auto-refresh court |
| Élévation de privilège (premium) | Trigger + JWT role check + `set_user_premium` service_role only |
| Accès aux données d'un autre utilisateur | RLS `auth.uid()` sur toutes les tables |
| Injection via URL scheme | Parsing strict + validation regex du code PKCE |
| Suppression de compte malveillante | Confirmation par mot de passe (ré-authentification Supabase) |
| Fuite via messages d'erreur | Messages génériques côté client |
| Enumération d'emails | Message d'erreur identique succès/échec sur forgot-password |

---

## Réponse aux incidents

1. Révoquer les sessions compromises via Supabase Dashboard → Authentication → Users.
2. Révoquer la clé `anon` si compromission API → regénérer dans Project Settings → API.
3. Pour une fuite de données : notifier les utilisateurs concernés sous 72h (RGPD).
4. Logs disponibles dans Supabase Dashboard → Logs.

---

## Checklist pré-release

- [ ] Confirmer que la clé `service_role` n'est jamais exposée côté client
- [ ] Activer les alertes de login suspect dans Supabase Auth
- [ ] Configurer un rate limit sur les endpoints auth (Supabase → Auth → Rate Limits)
- [ ] Tester les 5 scénarios RLS avec `supabase/tests/rls_verification.sql`
- [ ] Vérifier le certificat SSL du domaine custom si configuré
- [ ] Activer Sentry (ou équivalent) avec filtrage des données personnelles
