# Contributing to MoodMap

## Prérequis

| Outil | Version minimale |
|---|---|
| Node.js | 22 |
| pnpm | 10.33.2 |
| Xcode | 16+ (iOS) |
| Android Studio | 2024+ (Android) |
| EAS CLI | `npm i -g eas-cli` |
| Maestro | `curl -Ls "https://get.maestro.mobile.dev" | bash` |

## Setup initial

```bash
# 1. Cloner le dépôt
git clone https://github.com/your-org/moodmap.git
cd moodmap

# 2. Installer les dépendances
pnpm install

# 3. Configurer les variables d'environnement
cp .env.example apps/mobile/.env.local
# Renseigner EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY

# 4. Appliquer les migrations Supabase
supabase db reset --local  # ou via Supabase Dashboard

# 5. Lancer l'app en développement (simulateur iOS)
pnpm --filter mobile ios
```

## Structure du monorepo

```
apps/mobile/      Application React Native / Expo
packages/config/  Supabase client, Sentry init (partagés)
packages/validation/  Schémas Zod partagés
supabase/         Migrations SQL, Edge Functions
docs/             Documentation technique
.maestro/         Flows de tests E2E
```

## Variables d'environnement

Copier `apps/mobile/.env.example` → `apps/mobile/.env.local` et renseigner :

| Variable | Obligatoire | Description |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | ✅ | URL du projet Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Clé publique Supabase |
| `EXPO_PUBLIC_SENTRY_DSN` | ❌ | DSN Sentry (optionnel en dev) |
| `OPENAI_API_KEY` | ❌ | Backend uniquement |
| `REVENUECAT_WEBHOOK_SECRET` | ❌ | Edge Function uniquement |

> Ne jamais committer de fichier `.env` ou `.env.local`.

## Workflows de développement

### Lancer les tests

```bash
pnpm -r test               # Tous les tests (unit)
pnpm -r test --coverage    # Avec rapport de couverture
```

### Typecheck & lint

```bash
pnpm -r typecheck
pnpm -r lint
```

### Tests E2E (Maestro)

Nécessite un development build sur simulateur ou appareil physique.

```bash
# Build développement iOS (simulateur)
cd apps/mobile && eas build --platform ios --profile development --local

# Lancer tous les flows
maestro test .maestro/ \
  --env APP_ID=com.khettal.moodmap.dev \
  --env TEST_EMAIL=test@example.com \
  --env TEST_PASSWORD=TestPassword1
```

### Build preview (distribution interne)

```bash
# Déclenche un build EAS pour iOS + Android (channel preview)
cd apps/mobile && eas build --platform all --profile preview
```

## Conventions de commit

Format : `type(scope): description`

| Type | Usage |
|---|---|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `test` | Ajout/modification de tests |
| `refactor` | Refactoring sans changement fonctionnel |
| `docs` | Documentation uniquement |
| `ci` | Pipeline CI/CD |
| `chore` | Maintenance (deps, config) |

Exemples :
```
feat(check-in): ajouter sélection de tags
fix(auth): corriger le refresh de session sur Android
test(sleep): couvrir sleepQualityFromMinutes
```

## Branching

| Branche | Rôle |
|---|---|
| `main` | Production — merge via PR uniquement |
| `dev` | Intégration — base de travail |
| `feature/*` | Nouvelles fonctionnalités |
| `fix/*` | Corrections de bugs |
| `hotfix/*` | Correctifs urgents sur main |

## Sécurité & privacy

MoodMap manipule des données émotionnelles personnelles. Toute contribution doit respecter :

- **RLS** : toute nouvelle table doit avoir des politiques RLS activées
- **Consentement** : aucune donnée contextuelle sans consentement explicite de l'utilisateur
- **PII** : aucune donnée personnelle dans les logs Sentry (configurer `scrubFields`)
- **Secrets** : jamais de clé en dur dans le code — utiliser `.env.local`
- **Revue** : les PR touchant `supabase/migrations/` ou les services d'auth nécessitent une revue sécurité

Consulter [docs/security.md](docs/security.md) et [docs/privacy.md](docs/privacy.md) avant toute modification sensible.

## CI

Le pipeline CI (`ci.yml`) exécute automatiquement :

1. **Secret scanning** — gitleaks sur chaque push
2. **Typecheck** — `tsc --noEmit`
3. **Lint** — ESLint strict
4. **Tests** — Jest avec coverage (upload Codecov)
5. **Audit** — `pnpm audit --audit-level moderate`

Les PR sont bloquées si l'une de ces étapes échoue.

Les builds EAS (`.github/workflows/eas-build.yml`) se déclenchent sur les tags `v*` ou manuellement.

Les tests E2E Maestro (`.github/workflows/e2e.yml`) s'exécutent sur push `main` via un runner macOS avec simulateur iOS.

## Questions

Ouvrir une issue ou contacter l'équipe via le canal de discussion du projet.
