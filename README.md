# eHosp — Assistant IA Santé avec RAG et MCP

> **Architecture de démonstration IA médicale** — Interface mobile Expo connectée à un orchestrateur clinique intelligent avec RAG (HAS) et MCP (Model Context Protocol).

![Architecture](./docs/architecture.png)

---

## Positionnement

eHosp est une architecture de démonstration orientée **IA médicale**, conçue pour limiter au maximum la dépendance aux services cloud côté données métier.

- Les **données applicatives sensibles** (dossiers médicaux, constantes, historiques) sont stockées localement dans **SQLite**.
- La couche **LLM et embeddings** utilise actuellement l'API **Mistral AI** (`open-mistral-7b`, `mistral-embed`) pour la démonstration, avec une architecture prévue pour être remplacée par un **modèle local** (ex. Llama-3-8B sur Mac/serveur souverain) selon les contraintes réglementaires et de sécurité.

**Ce projet n'est pas "zero-cloud"** : il utilise Mistral AI pour l'inférence et les embeddings. L'objectif est de démontrer une **architecture hybride** avec stockage local des données patients et LLM externe interchangeable.

---

## Objectif du Projet

Démontrer comment une application mobile de santé peut connecter un utilisateur à un assistant IA capable de :

1. **Structurer une demande médicale** — Évaluation initiale des symptômes et triage automatisé.
2. **Contextualiser la réponse avec des documents métiers** — Interrogation en temps réel des recommandations de la Haute Autorité de Santé (HAS).
3. **Consulter des données patient locales** — Exploitation de l'historique et des constantes stockées hors-ligne (SQLite).
4. **Vérifier la disponibilité d'un professionnel de santé** — Planification dynamique et de garde des médecins spécialistes.
5. **Préparer une orientation ou une prise de rendez-vous** automatique en cas de besoin avéré.

> **Disclaimer** : L'application ne vise pas à remplacer un médecin. Elle sert de démonstrateur d'architecture IA pour l'orientation, la structuration de l'information et l'aide à la décision.

---

## Architecture Globale

```
       [ Application mobile Expo / React Native ]
                           |
                           v  (Requêtes HTTP REST)
             [ API Backend Express.js ]
                           |
       ---------------------------------------------
       |                                           |
       v  (Lecture / Écriture)                     v
[ SQLite local : ehosp.db ]                [ Orchestrateur IA ]
       |                                           |
       |                            ---------------------------------
       |                            |                               |
       v                            v                               v
[ Données patient ]             [ RAG HAS ]                   [ Client MCP ]
                                                            (Stdio Transport)
                                                                    |
                                                                    v
                                                            [ Serveur MCP Réel ]
                                                                    |
                                                      [ Outils métier exposés au LLM ]
                                                      - get_patient_history
                                                      - check_doctor_planning
                                                      - search_medical_guidelines
                                                      - create_appointment
```

Cette architecture sépare clairement l'interface utilisateur, la logique backend, la base de données locale, la couche RAG et les outils MCP. L'objectif est d'éviter un simple appel direct au LLM et de construire une **application IA réellement intégrée à un système métier existant**.

---

## Stack Technique

| Couche | Technologies |
|---|---|
| **Client Mobile** | Expo SDK 54, React Native, Redux Toolkit, NativeWind (TailwindCSS), Lottie Animations |
| **Backend API** | Node.js, Express.js, SQLite (`node:sqlite` natif Node.js v24+, WAL mode) |
| **IA & NLP** | API Mistral AI (`open-mistral-7b`, `mistral-embed`) |
| **Protocole Outils** | Model Context Protocol (MCP SDK Anthropic, transport Stdio) |
| **Sécurité locale** | LocalAuthentication (FaceID/TouchID), AsyncStorage (cache session) |
| **RAG** | Embeddings cosinus, chunking par sections, index local en mémoire |

---

## RAG et MCP — Rôle dans l'Architecture

### RAG (Retrieval-Augmented Generation)

Le RAG permet d'enrichir les réponses du modèle avec des **documents métier contrôlés** pour éradiquer les hallucinations cliniques.

Dans ce projet, les **fiches médicales officielles de la HAS** (Urgences Cardiaques, HTA, Diabète, etc.) situées dans `server/rag_documents/` sont :
1. Découpées en sections au démarrage du serveur.
2. Vectorisées via l'API `mistral-embed`.
3. Indexées localement en mémoire (vecteurs cosinus).
4. Interrogées par **recherche sémantique par similarité** à chaque message utilisateur.

### MCP (Model Context Protocol)

Le MCP permet au modèle d'interagir de manière **sécurisée et normalisée** avec les APIs et bases de données métiers de l'hôpital.

- Le serveur MCP s'exécute dans un **processus distinct** via transport Stdio.
- Il expose des outils et confie leur sélection et paramétrage au LLM lors de la phase de **Function Calling**.

### Outils MCP Exposés

| Outil | Description |
|---|---|
| `get_patient_history` | Récupère le dossier médical complet du patient (âge, poids, antécédents, constantes) depuis SQLite |
| `check_doctor_planning` | Recherche les spécialistes disponibles de garde dans le service demandé (ex: Cardiologue) |
| `search_medical_guidelines` | Effectue la recherche RAG vectorielle sémantique dans les guides HAS |
| `create_appointment` | Enregistre une consultation confirmée dans la base de données SQLite |

---

## Fonctionnalités Principales

### Architecture Agentique Multi-Spécialiste
L'IA évalue les demandes et transfère automatiquement le patient vers le spécialiste virtuel adéquat (Dermatologue, Cardiologue, etc.) avec **adaptation dynamique du prompt système**.

### Capteurs & IoT Locaux
Un algorithme d'analyse optique capture la **fréquence cardiaque en direct** via l'appareil photo du smartphone, sans aucun matériel additionnel.

### Analyse Multimodale d'Ordonnances
Un scanner de prescriptions médicales (OCR & Vision) extrait et structure les posologies des médicaments instantanément.

### Analyse Nutritionnelle par Photo
L'utilisateur photographie son repas et l'IA en extrait les **valeurs nutritionnelles** pour les lister dans son suivi métabolique.

### Démonstrateur Blockchain (Polygon)
Preuve cryptographique d'inviolabilité du consentement RGPD et des bilans de santé, enregistrée sur le réseau **Polygon**.

### Design Premium Unifié (Style Revolut)
Interface blanc cassé épurée, animations fluides Lottie, boutons soignés et transitions conçues pour une expérience premium.

---

## Scénario de Démonstration (Entretien Technique)

Saisissez ce prompt dans le chat de l'application :

```
"J'ai une forte douleur dans la poitrine depuis ce matin.
Peux-tu regarder mes antécédents et voir si je peux consulter un spécialiste aujourd'hui ?"
```

### Flux Technique Observé dans la Console Express

```
1. 🔧 MCP get_patient_history     → Récupère le profil SQLite (antécédents HTA)
2. 📚 MCP search_medical_guidelines → RAG sur triage_urgences.md (score > 0.8)
3. 🚨 Score urgence > 8/10         → Bannière rouge + alerte SAMU (15)
4. 👨‍⚕️ MCP check_doctor_planning   → Dr. Dupuis (Cardiologue) disponible
5. 📅 MCP create_appointment       → Rendez-vous enregistré dans SQLite
```

---

## Limites et Points de Vigilance Architecturaux

| Point | Détail |
|---|---|
| **LLM externe** | L'inférence utilise Mistral AI cloud. Migration vers Llama-3-8B local prévue. |
| **Pas de diagnostic médical** | L'IA structure l'information et oriente, elle ne pose pas de diagnostic certifié. |
| **Données de santé isolées** | Stockage local SQLite, jamais envoyées au LLM (seul le résumé y est injecté). |
| **Contrôle humain obligatoire** | Toute action critique (RDV, appel urgences) nécessite validation utilisateur. |
| **Variables sensibles** | Clés API dans `.env`, exclues du dépôt via `.gitignore`. |
| **Journalisation** | Tous les appels API et outils MCP sont loggués dans la console serveur. |

---

## Installation Locale

### Prérequis

- **Node.js v24+** (requis pour `node:sqlite` natif)
- **npm** ou **yarn**
- **Expo CLI** (`npx expo`)
- **Clé API Mistral AI** (gratuite sur [console.mistral.ai](https://console.mistral.ai))

### 1. Variables d'Environnement

> ⚠️ Les clés API ne doivent jamais être versionnées. Les fichiers `.env` sont exclus via `.gitignore`.

**Fichier `.env` à la racine du projet :**

```env
EXPO_PUBLIC_BACKEND_URL=http://<IP_DE_VOTRE_MAC>:3000
EXPO_PUBLIC_LOCAL_STORAGE=true
EXPO_PUBLIC_ALL_FREE=true
EXPO_PUBLIC_MISTRAL_API_KEY=your_mistral_api_key_here
```

**Fichier `server/.env` :**

```env
PORT=3000
MISTRAL_API_KEY=your_mistral_api_key_here
```

### 2. Démarrage du Serveur Backend

```bash
cd server
npm install
npm start
```

Le serveur va automatiquement :
- Initialiser le fichier SQLite local `ehosp.db`
- Créer le compte admin (`altayinvestpro@gmail.com` / `admin123!`)
- Indexer les documents HAS via RAG (embeddings Mistral)
- Connecter le client MCP au serveur Stdio
- Exposer l'API REST sur le port 3000

**Validation autonome du pipeline (sans mobile) :**
```bash
node test_pipeline.js
```

### 3. Démarrage de l'Application Mobile

**Sur simulateur iOS :**
```bash
npx expo start --ios --clear
```

**Sur votre iPhone via réseau LAN :**
```bash
npx expo start --lan
```
Puis scannez le QR code avec l'app **Expo Go** depuis l'App Store.

> Assurez-vous que votre Mac et votre iPhone sont sur le **même réseau Wi-Fi**.

---

## Compte Admin

| Champ | Valeur |
|---|---|
| **Email** | `altayinvestpro@gmail.com` |
| **Mot de passe** | `admin123!` |
| **Rôle** | `admin` (accès console administration mobile) |

---

## Évolutions Prévues

- [ ] Remplacement du LLM cloud par **Llama-3-8B** en exécution 100% hors-ligne
- [ ] Ajout d'une authentification biométrique forte de bout en bout
- [ ] Chiffrement matériel local de SQLite via **SQLCipher**
- [ ] Conteneurisation **Docker** du backend pour déploiement serveur souverain
- [ ] Portail praticien pour le suivi clinique en temps réel
- [ ] Tests unitaires et d'intégration sur le pipeline RAG+MCP

---

## Ce que Démontre ce Projet

Ce projet démontre la capacité à concevoir et implémenter une solution d'IA appliquée complète :

✅ **Architecture mobile** multiplateforme réactive et soignée (Expo/RN)  
✅ **Backend REST Express** avec base SQLite relationnelle et migrations  
✅ **Intégration avancée LLM** avec gestion d'état de conversation et streaming  
✅ **Pipeline RAG vectoriel local** (chunking → embeddings → similarité cosinus)  
✅ **Protocole MCP standardisé** avec manipulation d'outils métiers réels  
✅ **Sécurité** (FaceID, stockage local, variables d'environnement)  
✅ **Explicabilité IA (XAI)** — affichage du raisonnement et des sources pour chaque réponse  
✅ **Architecture hybride** prête pour migration vers modèle souverain local  

---

## Structure du Projet

```
app-ehosp/
├── src/
│   ├── ai/
│   │   └── AgentOrchestrator.ts     # Orchestrateur IA (RAG + MCP + streaming)
│   ├── navigation/
│   │   ├── RootNavigator.tsx        # Navigation conditionnelle (auth, rôles)
│   │   └── MainTabNavigator.tsx     # Onglets principaux
│   ├── screens/
│   │   ├── chat/ChatScreen.tsx      # Interface Dr. IA avec historique
│   │   ├── triage/TriageScreen.tsx  # Triage d'urgence interactif
│   │   ├── home/HomeScreen.tsx      # Tableau de bord patient
│   │   └── admin/AdminDashboardScreen.tsx
│   ├── services/
│   │   └── FirebaseService.ts       # Couche d'abstraction Local/Cloud
│   └── theme.ts                     # Design tokens centralisés
├── server/
│   ├── index.js                     # API Express principale
│   ├── database.js                  # ORM SQLite maison
│   ├── mcp-server.js                # Serveur MCP (outils métier)
│   ├── rag.js                       # Pipeline RAG (embeddings + recherche)
│   ├── rag_documents/               # Protocoles HAS (triage, HTA, diabète...)
│   └── test_pipeline.js             # Test autonome du pipeline complet
└── README.md
```

---

## Licence

Projet de démonstration technique — usage éducatif et présentation professionnelle uniquement.

> Développé par **Altay Çevik** — Architecture IA Médicale avec RAG, MCP et Expo React Native.
