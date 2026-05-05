# Tests natifs mobile

MoodMap peut fonctionner dans Expo Go pour le journal, le temps d'écran manuel, les tendances et l'export.

Les modules Sommeil et Activité physique utilisent des APIs natives :

- iOS : HealthKit via `@kingstinct/react-native-healthkit`
- Android : Health Connect via `react-native-health-connect`

Ces modules ne sont pas disponibles dans Expo Go. Ils doivent être testés dans une development build.

## Development build

Installer et lancer une build de développement :

```bash
pnpm --filter mobile exec expo prebuild
pnpm --filter mobile exec expo run:ios
pnpm --filter mobile exec expo run:android
```

Avec EAS :

```bash
pnpm --filter mobile exec eas build --profile development --platform ios
pnpm --filter mobile exec eas build --profile development --platform android
```

## Maestro E2E

Les flows Maestro sont dans `.maestro/` et ciblent d'abord les flux critiques :

- connexion ;
- ouverture du check-in ;
- navigation calendrier.

Exemple iOS :

```bash
maestro test -e APP_ID=com.khettal.moodmap.dev -e TEST_EMAIL=toi@example.com -e TEST_PASSWORD=motdepasse .maestro/auth-login.yaml
maestro test -e APP_ID=com.khettal.moodmap.dev .maestro/check-in-smoke.yaml
maestro test -e APP_ID=com.khettal.moodmap.dev .maestro/calendar-navigation.yaml
```

Exemple Android :

```bash
maestro test -e APP_ID=com.moodmap.app -e TEST_EMAIL=toi@example.com -e TEST_PASSWORD=motdepasse .maestro/auth-login.yaml
maestro test -e APP_ID=com.moodmap.app .maestro/check-in-smoke.yaml
maestro test -e APP_ID=com.moodmap.app .maestro/calendar-navigation.yaml
```

## iOS HealthKit

À vérifier sur appareil réel :

- L'app demande la permission HealthKit au moment où Sommeil ou Activité est activé.
- Refuser la permission n'active pas le consentement MoodMap.
- Accepter la permission active seulement le module demandé.
- Le check-in lit uniquement les données autorisées et agrégées.
- Si aucune donnée santé n'existe pour la journée, le check-in reste utilisable.
- Révoquer le module dans MoodMap permet de garder ou supprimer les données déjà enregistrées.

Données autorisées MVP :

- Sommeil : durée, heure de coucher, heure de réveil, qualité estimée, source.
- Activité : pas, minutes actives estimées, minutes d'entraînement, niveau agrégé, source.

Ne pas collecter au MVP :

- fréquence cardiaque
- GPS ou itinéraires
- calories détaillées
- phases détaillées de sommeil
- données biométriques avancées

## Android Health Connect

À vérifier sur appareil réel :

- Health Connect est installé et disponible.
- L'app demande uniquement `SleepSession`, `Steps` et `ExerciseSession`.
- Refuser la permission n'active pas le consentement MoodMap.
- Accepter la permission active seulement le module demandé.
- Le check-in lit uniquement les agrégats nécessaires.
- L'absence de données n'empêche pas le check-in.
- La suppression des données d'un module efface uniquement les colonnes concernées.

## Critères de sécurité

- Aucun accès santé ne doit être demandé au lancement de l'app.
- Les données doivent être lues localement avant envoi.
- Aucune donnée santé brute inutile ne doit être stockée.
- Les données contextuelles ne doivent pas être écrites si le consentement du module est inactif.
- Les erreurs de permission doivent rester génériques et ne pas révéler de contenu sensible.
