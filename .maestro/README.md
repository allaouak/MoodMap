# Maestro E2E

Ces flows couvrent les premiers chemins critiques MoodMap : authentification, ouverture du check-in et navigation calendrier.

## Prérequis

- Une development build installée et lancée.
- Un compte de test Supabase valide.
- Maestro installé localement.

## Lancer les flows

iOS :

```bash
maestro test -e APP_ID=com.khettal.moodmap.dev -e TEST_EMAIL=toi@example.com -e TEST_PASSWORD=motdepasse .maestro/auth-login.yaml
maestro test -e APP_ID=com.khettal.moodmap.dev .maestro/check-in-smoke.yaml
maestro test -e APP_ID=com.khettal.moodmap.dev .maestro/calendar-navigation.yaml
```

Android :

```bash
maestro test -e APP_ID=com.moodmap.app -e TEST_EMAIL=toi@example.com -e TEST_PASSWORD=motdepasse .maestro/auth-login.yaml
maestro test -e APP_ID=com.moodmap.app .maestro/check-in-smoke.yaml
maestro test -e APP_ID=com.moodmap.app .maestro/calendar-navigation.yaml
```

`check-in-smoke.yaml` n'enregistre pas encore le formulaire : il valide l'ouverture du parcours et les premières interactions sans dépendre de l'état des consentements contextuels.

