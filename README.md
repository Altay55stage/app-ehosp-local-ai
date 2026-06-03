# eHosp Mobile

Application mobile React Native (Expo) orientee sante, avec IA medicale, triage et gestion de profils famille.

## Prerequis

- Node.js 20+
- npm 10+
- Expo CLI (via `npx expo`)
- iOS Simulator ou Android Emulator

## Installation

```bash
npm install
```

## Configuration environnement

Creer un fichier `.env` a la racine :

```env
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_DATABASE_URL=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=

MISTRAL_API_KEY=
EXPO_PUBLIC_MISTRAL_API_KEY=
EXPO_PUBLIC_MISTRAL_MODEL=mistral-large-latest
EXPO_PUBLIC_MISTRAL_VISION_MODEL=pixtral-large-latest

EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
```

## Lancement

```bash
npm run start
```

Puis :
- `i` pour iOS
- `a` pour Android
- `w` pour web

## Flux principal actuel

- Authentification (email/mot de passe + Google)
- Consentement RGPD onboarding
- Questionnaire sante initial (15 questions)
- Verification biometrie
- Selection profil
- Navigation principale (Accueil, Chat, Triage, Analyses, Famille, Profil)

## Fichiers importants

- `App.tsx` : providers globaux
- `src/navigation/RootNavigator.tsx` : gating du flux utilisateur
- `src/ai/AgentOrchestrator.ts` : routage IA medicale
- `src/services/MistralAIService.ts` : appel Mistral AI
- `src/services/FirebaseService.ts` : auth + realtime database

## Notes

- `cgu-ehosp.pdf` est present a la racine du projet comme reference juridique.
- Ne jamais hardcoder de cle API dans le code.
