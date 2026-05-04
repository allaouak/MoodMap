# Politique de confidentialité MoodMap (interne)

> Ce document est la référence interne. La politique publique destinée aux utilisateurs doit être rédigée par un juriste avant publication.

---

## Données collectées

| Donnée | Obligatoire | Finalité |
|---|---|---|
| Email | Oui | Authentification |
| Prénom / pseudo | Oui | Personnalisation |
| Humeur (1-5) | Oui | Fonctionnalité principale |
| Énergie (1-5) | Oui | Fonctionnalité principale |
| Stress (1-5) | Oui | Fonctionnalité principale |
| Tags (contexte) | Non | Enrichissement |
| Note libre | Non | Journal personnel |
| Timezone | Non | Notifications locales |
| Avatar URL | Non | Personnalisation |
| Consentements contextuels | Non | Activation granulaire des modules |
| Sommeil agrégé | Non | Corrélations descriptives avec le ressenti |
| Activité physique agrégée | Non | Corrélations descriptives avec le ressenti |
| Temps d'écran agrégé | Non | Corrélations descriptives avec le ressenti |

**Non collecté** : localisation, contacts, données biométriques brutes, identifiants publicitaires, GPS, itinéraires, audio, contenu consulté, historique détaillé application par application.

---

## Minimisation des données

- Les données biométriques (Face ID / Touch ID) ne quittent jamais l'appareil. MoodMap utilise uniquement le résultat booléen de l'API système.
- Les notes sont optionnelles et limitées à 500 caractères.
- Les tags sont limités à 10 par entrée, 30 caractères chacun.
- Les données contextuelles sont activées module par module, avec consentement explicite et révocable.
- Le sommeil, l'activité et le temps d'écran sont stockés sous forme agrégée. MoodMap ne stocke pas les phases détaillées de sommeil, données cardiaques, localisation, itinéraires ou historique détaillé des applications.

---

## Sous-traitants

| Sous-traitant | Rôle | Localisation | DPA |
|---|---|---|---|
| Supabase Inc. | Base de données, Auth | AWS us-east-1 (par défaut) | [supabase.com/privacy](https://supabase.com/privacy) |
| OpenAI (futur) | Résumés IA | USA | À signer avant activation |
| RevenueCat (futur) | Paiements | USA | À signer avant activation |
| Sentry (futur) | Crash reporting | À préciser | À signer avant activation |

**Action requise avant production** : signer les DPA avec chaque sous-traitant, ou choisir des alternatives européennes (ex: migrer Supabase vers région EU).

---

## Conservation et suppression

- **Durée de conservation** : jusqu'à suppression du compte par l'utilisateur.
- **Suppression** : via Réglages → "Supprimer mon compte". Efface en cascade `mood_entries`, `profiles`, et `auth.users`.
- **Export** : disponible via Réglages → "Exporter mes données". Génère un fichier JSON contenant le profil, les entrées d'humeur, les consentements contextuels et les données contextuelles agrégées.
- **Révocation contextuelle** : chaque module contextuel peut être désactivé séparément. L'utilisateur peut garder les données déjà enregistrées ou les supprimer lors de la révocation.
- **Comptes inactifs** : pas de purge automatique pour l'instant. À définir (ex: suppression après 3 ans d'inactivité avec notification préalable).

---

## Utilisation de l'IA

- L'IA (OpenAI) n'est pas encore activée.
- Quand elle le sera : uniquement pour les utilisateurs premium, uniquement sur les données agrégées (pas les notes brutes sans consentement explicite), avec opt-out possible.
- Aucune donnée émotionnelle ne sera utilisée pour entraîner des modèles.
- Les prompts envoyés à OpenAI ne contiendront jamais l'email ou le nom de l'utilisateur.

---

## Logs et observabilité

- Les logs applicatifs (futures Sentry / Supabase Logs) ne doivent contenir **aucune donnée émotionnelle** ni note personnelle.
- Les IDs utilisateurs dans les logs doivent être hashés ou pseudonymisés.
- Durée de rétention des logs : 30 jours maximum.

---

## Droits des utilisateurs (RGPD)

| Droit | Implémenté | Mécanisme |
|---|---|---|
| Accès | Partiel | Via l'app (données visibles) |
| Rectification | Oui | Modification des entrées |
| Suppression | Oui | Réglages → Supprimer mon compte |
| Portabilité | Oui | Export JSON depuis les réglages |
| Opposition | Non | À implémenter (opt-out IA) |
| Limitation | Partiel | Révocation des modules contextuels |

---

## Checklist RGPD pré-release

- [ ] Rédiger la politique de confidentialité publique avec un juriste
- [ ] Ajouter le bandeau de consentement si cookies/analytics web
- [ ] Signer les DPA avec tous les sous-traitants
- [ ] Migrer Supabase vers région EU ou documenter le transfert USA
- [x] Implémenter l'export de données JSON (portabilité technique)
- [ ] Désigner un référent RGPD (DPO si nécessaire)
- [ ] Documenter la durée de rétention des comptes inactifs
- [ ] Tester le flow de suppression de bout en bout
