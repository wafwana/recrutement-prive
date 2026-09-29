# Activation et Utilisation du Fournisseur IA Gemini Gratuit en Environnement de Test

Ce document décrit l'implémentation, les limites de confidentialité et les conditions d'activation du mode Gemini gratuit dans Recrutement Privé.

---

## 1. Principes de Confidentialité et Règle Stricte d'Interdiction

Le fournisseur **Gemini gratuit** est conçu exclusivement pour l'analyse de texte brut **public, fictif ou non confidentiel** (ex. offres d'emploi publiques sans coordonnées).

### Règle Stricte sur les Fichiers Joints (`fileInput`)
**Tout fichier joint (CV PDF, Word, images) est STRICTEMENT INTERDIT pour le fournisseur Gemini gratuit et déclenche un blocage immédiat à 100% (0 appel réseau), même si `isMockData: true` est spécifié.**

### Garde-fous Pré-Réseau (Pre-Network Blocking)
Avant tout appel réseau vers l'API Gemini, le module `lib/ai/privacy.ts` effectue des vérifications déclaratives ET une inspection dynamique du contenu :
- **Fichiers joints & Pièces jointes** : Bloqués à 100% (0 appel réseau).
- **CV réels & Parcours candidats** : Bloqués à 100% (0 appel réseau).
- **Données candidates & PII (Emails, Téléphones)** : Bloquées à 100% (0 appel réseau).
- **Données pseudonymisées** : Bloquées à 100% (la pseudonymisation n'est pas acceptée comme anonymisation suffisante).
- **Offres confidentielles d'entreprise** : Bloquées à 100% (0 appel réseau).
- **Identifiants internes de plateforme (CUIDs, UUIDs)** : Bloqués à 100% (0 appel réseau).

---

## 2. Authentification Sécurisée et Protection des Logs

1. **Authentification par En-tête HTTP** :
   L'API Gemini utilise l'en-tête HTTP `x-goog-api-key: GEMINI_API_KEY`. La clé d'API n'est **jamais passée dans l'URL**, évitant toute fuite dans les journaux de requêtes serveur ou proxies.

2. **Journalisation Sans Fuite de Données** :
   - Les prompts, le texte des offres/fichiers, les données personnelles et les clés d'API ne sont **jamais** journalisés.
   - Les erreurs de communication réseau sont résumées par des messages génériques (ex. `Erreur de communication API (HTTP 500)`).

---

## 3. Activation en Environnement de Test

Pour tester Gemini localement sans affecter la production :

```bash
# Variables à définir dans l'environnement de test uniquement
AI_PROVIDER=gemini
GEMINI_API_KEY=AIzaSy_VOTRE_CLE_DE_TEST_ICI
GEMINI_MODEL=gemini-1.5-flash
```

---

## 4. Intégration OpenAI Conservée

L'intégration **OpenAI** conserve son comportement d'origine pour l'analyse de tous les CV réels et données privées. Si `AI_PROVIDER` n'est pas défini sur `gemini`, le système utilise `openai` par défaut lorsqu'une `OPENAI_API_KEY` est disponible.

**En cas d'épuisement de crédits OpenAI ou d'erreur réseau, le système ne bascule JAMAIS automatiquement vers Gemini pour des données candidates ou confidentielles.**
