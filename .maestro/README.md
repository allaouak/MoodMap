# Maestro E2E

Ces flows couvrent les premiers chemins critiques MoodMap : authentification, ouverture du check-in et navigation calendrier.

## Prérequis

- Une development build installée et lancée.
- Un compte de test Supabase valide.
- Maestro installé localement.
- Pour GitHub Actions, les secrets suivants doivent exister :
  - `E2E_TEST_EMAIL`
  - `E2E_TEST_PASSWORD`
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Lancer les flows

iOS :

```bash
TEST_EMAIL=toi@example.com TEST_PASSWORD=motdepasse pnpm e2e:ios:smoke
```

Ou flow par flow :

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

Les flows `auth-register`, `settings-change-password`, `settings-export` et `biometric-lock` restent manuels ou ciblés, car ils dépendent d'un compte jetable, de permissions système ou d'une interaction biométrique.
