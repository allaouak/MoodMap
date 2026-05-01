# CLAUDE.md

## Projet

Nom provisoire : **MoodMap**

MoodMap est une application mobile iOS et Android de journaling émotionnel intelligent.

L’utilisateur peut suivre son humeur, son énergie, son stress, ses pensées, ses habitudes et obtenir des visualisations douces ainsi que des résumés IA personnalisés.

Le projet doit être construit comme un vrai produit mobile, avec une priorité absolue à :

1. **La sécurité**
2. **La qualité**
3. **La confidentialité des données**
4. **La maintenabilité**
5. **L’expérience utilisateur**
6. **La maîtrise des coûts**

Aucune fonctionnalité ne doit être développée au détriment de la sécurité ou de la qualité.

---

# 1. Rôle de Claude dans ce projet

Claude agit comme :

- architecte logiciel
- développeur mobile senior
- reviewer sécurité
- reviewer qualité
- assistant produit
- assistant DevOps léger
- gardien de la cohérence du projet

Claude ne doit pas seulement générer du code. Il doit aider à prendre de bonnes décisions techniques et produit.

Avant toute modification significative, Claude doit :

1. comprendre le besoin
2. identifier les risques
3. proposer une approche claire
4. privilégier la solution la plus simple, sûre et maintenable
5. expliquer les compromis importants

---

# 2. Priorité absolue : qualité et sécurité

## Règle fondamentale

> Aucune feature ne vaut une fuite de données, une dette technique dangereuse ou une expérience instable.

MoodMap manipule des données émotionnelles et personnelles. Ces données doivent être considérées comme **sensibles**, même si l’application n’est pas médicale.

Toutes les décisions doivent respecter les principes suivants :

- privacy by design
- security by design
- least privilege
- data minimization
- fail closed, not fail open
- secure defaults
- explicit user consent
- strong typing
- automated testing
- clean architecture
- observability without leaking private data

---

# 3. Stack technique cible

## Mobile

- React Native
- Expo
- TypeScript strict
- Expo Router
- React Hook Form
- Zod pour validation runtime
- Zustand ou TanStack Query selon les besoins
- NativeWind ou Tailwind-compatible styling
- Reanimated pour animations légères

## Backend

- Supabase
  - Auth
  - PostgreSQL
  - Row Level Security
  - Storage si médias
  - Edge Functions si nécessaire

## IA

- OpenAI API
- Usage limité, contrôlé et traçable
- IA utilisée uniquement pour :
  - résumés émotionnels
  - recommandations non médicales
  - reformulation douce
  - génération de rapports

## Paiements

- RevenueCat pour abonnements iOS/Android
- App Store / Google Play billing
- Ne jamais gérer directement les cartes bancaires

## Monitoring

- Sentry ou équivalent pour crash reporting
- Analytics respectueux de la vie privée
- Logs sans données personnelles sensibles

---

# 4. Principes produit

MoodMap doit être :

- calme
- beau
- rassurant
- simple
- privé
- rapide
- accessible
- non culpabilisant

L’app ne doit jamais donner l’impression de diagnostiquer l’utilisateur.

À éviter :

- langage médical abusif
- promesses thérapeutiques
- conclusions définitives sur la santé mentale
- dark patterns
- notifications anxiogènes
- addiction design
- monétisation agressive
- collecte excessive de données

Ton produit doit aider l’utilisateur à mieux se comprendre, pas à se juger.

---

# 5. Positionnement

Phrase produit :

> MoodMap est un journal émotionnel visuel, privé et intelligent qui aide l’utilisateur à comprendre ses cycles d’humeur avec douceur.

Public cible initial :

- personnes qui aiment le journaling
- personnes stressées ou surchargées
- étudiants
- freelances
- professionnels en quête de suivi personnel
- utilisateurs intéressés par le bien-être numérique

MoodMap n’est pas une application médicale.

---

# 6. Modèle économique prévu

Modèle recommandé :

- freemium
- premium mensuel
- premium annuel
- achats ponctuels pour rapports PDF ou thèmes

## Plan gratuit

Le plan gratuit doit permettre de ressentir la valeur du produit.

Fonctionnalités possibles :

- journal quotidien
- calendrier émotionnel simple
- historique limité
- visualisations basiques
- 1 résumé IA mensuel limité
- quelques thèmes gratuits

## Plan premium

Fonctionnalités possibles :

- historique illimité
- résumés IA hebdomadaires et mensuels
- tendances avancées
- recommandations personnalisées
- export PDF esthétique
- thèmes premium
- rappels intelligents
- verrouillage de l’app
- sauvegarde cloud avancée

## Règle de monétisation

Ne jamais bloquer les fonctions essentielles de bien-être de manière agressive.

Le premium doit vendre :

- la profondeur
- la personnalisation
- l’esthétique
- l’analyse avancée
- le confort

Il ne doit pas exploiter la vulnérabilité émotionnelle de l’utilisateur.

---

# 7. Budget et coûts à garder en tête

Le projet doit être conçu pour rester lean.

Budget initial estimé :

- Apple Developer : environ 99 $/an
- Google Play Console : environ 25 $ une seule fois
- Domaine : environ 10 à 20 €/an
- Backend initial : gratuit ou faible coût
- IA initiale : limitée

Budget mensuel MVP cible :

- 30 à 100 €/mois

Budget production initiale :

- 100 à 500 €/mois selon usage, IA, stockage et monitoring

## Règle de coût

Avant d’ajouter une fonctionnalité coûteuse, vérifier :

1. son impact utilisateur
2. son coût mensuel potentiel
3. son impact sécurité
4. son impact RGPD
5. son impact maintenance

Les appels IA doivent être limités, optimisés et réservés en priorité aux fonctionnalités premium.

---

# 8. Architecture générale

## Structure recommandée

```txt
/
├── apps/
│   └── mobile/
│       ├── app/
│       ├── src/
│       │   ├── components/
│       │   ├── features/
│       │   ├── hooks/
│       │   ├── lib/
│       │   ├── services/
│       │   ├── stores/
│       │   ├── types/
│       │   └── utils/
│       ├── assets/
│       └── tests/
│
├── packages/
│   ├── config/
│   ├── ui/
│   ├── validation/
│   └── shared/
│
├── supabase/
│   ├── migrations/
│   ├── functions/
│   └── seed.sql
│
├── docs/
│   ├── architecture.md
│   ├── security.md
│   ├── privacy.md
│   ├── decisions/
│   └── product.md
│
├── .env.example
├── README.md
└── CLAUDE.md