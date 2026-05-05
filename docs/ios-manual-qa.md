# QA manuel iOS

Cette checklist valide MoodMap sur une development build iOS avant de considérer une livraison mobile stable.

## Prerequis

- iPhone reel avec Face ID ou Touch ID configure.
- App Sante avec quelques donnees sommeil et pas, si possible.
- Compte Supabase de test connu.
- Variables app renseignees dans `.env` :
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - `EXPO_PUBLIC_SENTRY_DSN` si test Sentry necessaire
- Development build installee :

```bash
pnpm --filter mobile exec expo prebuild --platform ios
pnpm --filter mobile exec expo run:ios --device
```

## Smoke automatique local

Les flows non destructifs peuvent tourner avec Maestro :

```bash
TEST_EMAIL=toi@example.com TEST_PASSWORD=motdepasse pnpm e2e:ios:smoke
```

Flows inclus :

- login invalide
- login valide
- ouverture du check-in
- navigation calendrier
- navigation tendances
- suppression de compte annulee

## Authentification

- Premier lancement affiche l'ecran Welcome.
- Inscription avec email de test cree un profil.
- Connexion avec mauvais mot de passe ne donne pas acces aux tabs.
- Connexion avec bon mot de passe ouvre l'onglet Aujourd'hui.
- Deconnexion depuis Reglages revient au parcours public.
- Reset password envoie un email sans confirmer si le compte existe.
- Deep link `moodmap://reset-password?code=...` ouvre l'ecran nouveau mot de passe.
- Changement de mot de passe depuis Reglages exige le mot de passe actuel.

## Journal quotidien

- Si aucune entree du jour n'existe, le CTA de check-in est visible.
- Le check-in permet de choisir humeur, energie, stress.
- Les tags suggeres se selectionnent et se deselectionnent.
- Un tag personnalise est limite a 30 caracteres.
- La note est limitee a 500 caracteres.
- Enregistrer cree une seule entree pour le jour.
- Modifier une entree met a jour la meme entree, sans doublon.
- Le pull-to-refresh recharge l'entree du jour.

## Modules contextuels

- Aucun acces Sante n'est demande au lancement.
- Activer Sommeil affiche une explication avant la demande HealthKit.
- Refuser HealthKit n'active pas le consentement MoodMap.
- Accepter HealthKit active seulement le module demande.
- Si aucune donnee sommeil n'existe, le check-in reste utilisable.
- La saisie sommeil manuelle calcule une duree correcte, y compris passage minuit.
- Activer Activite demande uniquement les permissions necessaires.
- Le temps d'ecran reste manuel et n'ouvre pas de permission systeme.
- Desactiver un module propose de garder ou supprimer les donnees deja stockees.
- Supprimer les donnees d'un module n'efface pas les autres modules.

## Calendrier et tendances

- Calendrier affiche le mois courant.
- Le mois suivant est desactive au-dela du mois courant.
- Un jour avec entree affiche le detail humeur, energie, stress, tags, note.
- Les donnees contextuelles du jour apparaissent si disponibles.
- Tendances affiche un etat vide sans erreur avec peu de donnees.
- Avec plusieurs entrees, les stats 7 jours et 30 jours sont coherentes.
- Les observations contextuelles restent formulees prudemment, sans diagnostic medical.

## Reglages

- Modifier le nom met a jour le profil et l'en-tete Aujourd'hui.
- Notification quotidienne demande la permission iOS uniquement a l'activation.
- Changer l'heure de notification replanifie une seule notification.
- Desactiver les notifications annule les notifications planifiees.
- Activer Face ID demande une authentification.
- Mettre l'app en background verrouille l'ecran si le verrou est active.
- Revenir dans l'app affiche l'overlay de verrouillage.
- Exporter mes donnees produit un JSON partageable.
- Supprimer mon compte demande le mot de passe.
- Annuler la suppression ne supprime aucune donnee.

## Confidentialite et securite

- Les tokens Supabase restent stockes via `expo-secure-store`.
- Aucune donnee sensible n'apparait dans les erreurs visibles.
- Sentry ne recoit pas d'email, token, note, humeur, energie, stress ou tag en clair.
- Les donnees d'un utilisateur ne sont jamais visibles depuis un autre compte.
- La suppression de compte efface profil, humeur et donnees contextuelles.

## Sortie attendue

Avant de passer a la phase suivante :

- CI qualite vert.
- E2E smoke iOS vert ou erreur documentee.
- Checklist manuelle iOS completee.
- Bugs bloquants classes et corriges avant build preview.
