# eHosp - Assistant IA santé avec RAG et MCP

eHosp est une architecture de démonstration orientée IA médicale, conçue pour coupler une interface mobile moderne avec un orchestrateur clinique intelligent et autonome, s'appuyant sur des protocoles de connaissances cliniques rigoureux (RAG) et une exécution normalisée d'outils (MCP).

---

## Objectif du projet

L’objectif d’eHosp est de démontrer comment une application mobile de santé peut connecter un utilisateur à un assistant IA capable de :

- **Structurer une demande médicale** : Évaluation initiale des symptômes et triage automatisé.
- **Contextualiser la réponse** avec des documents métiers : Interrogation en temps réel des recommandations de la Haute Autorité de Santé (HAS).
- **Consulter des données patient locales** : Exploitation de l'historique et des constantes stockées hors-ligne.
- **Vérifier la disponibilité** d’un professionnel de santé : Planification dynamique et de garde des médecins spécialistes.
- **Préparer une orientation** ou une prise de rendez-vous automatique en cas de besoin avéré.

*L’application ne vise pas à remplacer un médecin. Elle sert de démonstrateur d’architecture IA pour l’orientation, la structuration de l’information et l’aide à la décision.*

---

## Positionnement

eHosp est une architecture de démonstration orientée IA médicale, conçue pour limiter au maximum la dépendance aux services cloud côté données métier.

Les données applicatives sensibles (dossiers médicaux, constantes, historiques) sont stockées localement dans SQLite. La couche LLM et embeddings utilise actuellement l’API Mistral AI pour la démonstration, avec une architecture prévue pour pouvoir être remplacée par un modèle local (ex. Llama-3-8B sur Mac/serveur souverain) selon les contraintes réglementaires et de sécurité.

---

## Architecture globale

```text
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

Cette architecture sépare clairement l’interface utilisateur, la logique backend, la base de données locale, la couche RAG et les outils MCP. L’objectif est d’éviter un simple appel direct au LLM et de construire une application IA réellement intégrée à un système métier existant.

---

## Stack technique

- **Client Mobile** : Expo SDK 54 / React Native, Redux Toolkit, TailwindCSS (NativeWind), Lottie Animations.
- **Backend API** : Node.js, Express, SQLite (`node:sqlite` natif de Node.js v24+, WAL mode).
- **IA & NLP** : API Mistral AI (`open-mistral-7b`, `mistral-embed`).
- **Protocole d'Outils** : Model Context Protocol (MCP SDK d'Anthropic).
- **Sécurité locale** : LocalAuthentication (FaceID/TouchID), AsyncStorage pour le cache de session.

---

## RAG et MCP : rôle dans l’architecture

### RAG (Retrieval-Augmented Generation)
Le RAG permet d’enrichir les réponses du modèle avec des documents métier contrôlés pour éradiquer les hallucinations cliniques.
Dans ce projet, les fiches médicales officielles de la HAS (Urgences Cardiaques, HTA, Diabète) situées dans `server/rag_documents/` sont découpées en sections au démarrage. Le backend calcule leurs embeddings via l'API `mistral-embed` et les indexe localement. Lors d'un message, une recherche sémantique par similarité cosinus extrait le contexte exact pour guider la complétion de l'IA.

### MCP (Model Context Protocol)
Le MCP permet au modèle d’interagir de manière sécurisée et normalisée avec les APIs et bases de données métiers de l'hôpital.
Le serveur MCP s'exécute dans un processus distinct en transport Stdio. Il expose les outils et en confie la sélection et les paramètres au LLM lors de la phase de *Function Calling*.

---

## Outils MCP exposés

- `get_patient_history` : Récupère le dossier médical complet du patient (âge, poids, antécédents, constantes).
- `check_doctor_planning` : Recherche les spécialistes disponibles de garde dans le service demandé (ex: Cardiologue).
- `search_medical_guidelines` : Effectue la recherche RAG vectorielle sémantique dans les guides HAS.
- `create_appointment` : Enregistre une consultation confirmée dans la base de données SQLite.

---

## Fonctionnalités d'entreprise & Potentiel Investisseurs

eHosp n'est pas qu'un simple outil de chat IA ; il propose des briques innovantes hautement attractives pour les partenaires et investisseurs :

1. **Architecture Agentique Multi-Spécialiste** : L'IA évalue les demandes et transfère automatiquement le patient vers le spécialiste virtuel adéquat (Dermatologue, Cardiologue, etc.) avec adaptation dynamique de son prompt système.
2. **Capteurs & IoT Locaux** : Un algorithme d'analyse optique capture la fréquence cardiaque en direct via l'appareil photo du smartphone sans aucun matériel additionnel.
3. **Analyse Multimodale d'Ordonnances** : Un scanner de prescriptions médicale (OCR & Vision) extrait et structure les posologies des médicaments instantanément.
4. **Analyse Nutritionnelle par Photo** : L'utilisateur photographie son repas et l'IA en extrait les valeurs nutritionnelles pour les lister dans son suivi métabolique.
5. **Démonstrateur d'Ancrage Blockchain** : Preuve cryptographique d'inviolabilité du consentement RGPD et des bilans de santé enregistrée sur le réseau Polygon.
6. **Design Premium Unifié (Style Revolut)** : Interface sombre raffinée, animations fluides, boutons soignés et transitions soyeuses conçues pour séduire immédiatement le client final.

---

## Scénario de démonstration (Entretien)

Saisissez ce prompt dans le chat de l'application :
> *"J'ai une forte douleur dans la poitrine depuis ce matin. Peux-tu regarder mes antécédents et voir si je peux consulter un spécialiste aujourd'hui ?"*

**Dans la console du serveur Express, le flux technique s'exécute en cascade :**
1. **Appel MCP `get_patient_history`** : L'IA récupère le profil de l'utilisateur stocké dans SQLite et constate qu'il a des antécédents cardiaques (ex: HTA).
2. **Appel MCP `search_medical_guidelines`** : L'IA déclenche la recherche RAG, extrait la fiche `triage_urgences.md` sur l'infarctus, et prend conscience de la gravité des symptômes.
3. **Alerte d'Urgence Immédiate** : L'application détecte un score de gravité clinique supérieur à 8/10 et affiche un bandeau rouge clignotant permettant d'appeler le SAMU (15) en un clic.
4. **Appel MCP `check_doctor_planning`** : En parallèle, l'IA cherche un cardiologue de garde et trouve le *Dr. Dupuis*.
5. **Appel MCP `create_appointment`** : L'IA pré-réserve formellement un créneau d'examen dans la base SQLite locale.

---

## Sécurité, limites et cadre médical

Ce projet est un démonstrateur technique et ne constitue pas un dispositif médical certifié.

L’IA ne pose pas de diagnostic médical. Elle sert à :
- Structurer les informations transmises par l’utilisateur.
- Détecter des signaux d’urgence potentiels.
- Proposer une orientation et recommander la prise de contact avec un professionnel.
- Pour les cas critiques, l’application priorise la prudence et l'appel aux services d'urgence.

Points de vigilance prévus dans l’architecture :
- Séparation physique des données de santé et de la couche IA générative.
- Stockage local sur le terminal ou dans l'infrastructure de l'établissement.
- Variables sensibles stockées dans `.env` et exclues du dépôt Git via `.gitignore`.
- Journalisation exhaustive de tous les appels d'API.
- Contrôle humain obligatoire avant validation d'une action critique.

---

## Installation locale

### 1. Configuration des variables d'environnement
Les clés API ne doivent jamais être versionnées. Les fichiers `.env` sont exclus du dépôt via `.gitignore`.

Créez un fichier `.env` à la **racine** de l'application :
```env
EXPO_PUBLIC_BACKEND_URL=http://<IP_DE_VOTRE_MAC>:3000
EXPO_PUBLIC_LOCAL_STORAGE=true
EXPO_PUBLIC_ALL_FREE=true
EXPO_PUBLIC_MISTRAL_API_KEY=your_mistral_api_key_here
```

Créez un fichier `.env` dans le dossier `server/` :
```env
PORT=3000
MISTRAL_API_KEY=your_mistral_api_key_here
```

### 2. Démarrage du Serveur Backend (Express + MCP + SQLite)
Ouvrez un terminal dans le dossier `server/` :
```bash
cd server
npm install
npm start
```
Le serveur va initialiser le fichier SQLite local `ehosp.db`, indexer les documents HAS et lancer le serveur MCP stdio.
*Vous pouvez lancer `node test_pipeline.js` dans le dossier `server/` pour valider le serveur de façon autonome.*

### 3. Démarrage de l'Application Mobile (Expo Go)
Pour charger l'application sur votre iPhone via Expo Go :
1. Téléchargez l'application **Expo Go** depuis l'App Store.
2. Assurez-vous que votre Mac et votre iPhone sont sur le **même réseau Wi-Fi**.
3. Récupérez l'IP locale de votre Mac (`ipconfig getifaddr en0`).
4. Dans le `.env` de la racine, assurez-vous que `EXPO_PUBLIC_BACKEND_URL` utilise l'IP locale du Mac (ex: `http://192.168.1.50:3000`).
5. Lancez le client en mode local LAN :
   ```bash
   npx expo start --lan
   ```
6. Scannez le QR Code affiché avec l'appareil photo de l'iPhone et ouvrez-le dans Expo Go.

---

## Ce que démontre ce projet

Ce projet démontre ma capacité à concevoir et implémenter une solution d'IA appliquée complète :
- Architecture mobile multiplateforme réactive et soignée.
- Création d'un backend REST Express avec base SQLite relationnelle.
- Intégration avancée de LLM avec gestion d'état de conversation.
- Mise en œuvre d'un pipeline RAG vectoriel local.
- Implémentation du protocole MCP standardisé et manipulation d'outils métiers.
- Alignement sur la sécurité (FaceID, stockage local) et l'explication logique (XAI).

---

## Évolutions prévues

- Remplacement du LLM cloud par un modèle local (ex. Llama-3-8B) en exécution 100% hors-ligne.
- Ajout d'une authentification biométrique forte de bout en bout.
- Chiffrement matériel local de la base de données SQLite via SQLCipher.
- Conteneurisation Docker du backend pour déploiement sur serveur souverain.
- Création d'un portail praticien pour le suivi clinique en temps réel.
