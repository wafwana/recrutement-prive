# Activation et Utilisation du Fournisseur IA Gemini Gratuit en Environnement de Test

Ce document décrit l'implémentation, les champs autorisés/interdits, les limites de confidentialité et les conditions d'activation du mode Gemini gratuit dans Recrutement Privé.

---

## 1. Politique Restrictive de Confidentialité Gemini

Le fournisseur **Gemini gratuit** est soumis à une politique restrictive centralisée (`lib/ai/privacy.ts`).

### A. Règle d'Interdiction Totale des Fichiers Joints (`fileInput`)
- **Tout fichier joint (CV PDF, Word, images, pièces jointes) est STRICTEMENT INTERDIT pour le fournisseur Gemini gratuit.**
- Le blocage est effectué avant tout appel réseau (`fetch = 0`), même en cas d'étiquette `isMockData: true` ou de classification déclarative.

### B. Classification `PUBLIC_OFFER` et Validation du Contenu
- **Une classification déclarative `PUBLIC_OFFER` ne donne JAMAIS une autorisation automatique.**
- Les requêtes destinées à Gemini gratuit sont obligatoirement reconstruites et filtrées à partir d'une **liste stricte de champs autorisés**.

---

## 2. Liste des Champs Autorisés et Interdits pour Gemini

### Champs EXPLICITEMENT AUTORISÉS (Allowlist)
- `title` : Intitulé générique du poste (ex. "Développeur Fullstack").
- `location` : Localisation générique (ville et/ou pays, ex. "Lyon, France").
- `missionType` : Type de contrat (ex. "CDI", "Freelance").
- `skills` : Liste de compétences techniques/métier sous forme de tableau de chaînes.
- `experienceYears` : Nombre d'années d'expérience sous forme numérique.
- `descriptionSummary` : Résumé générique du besoin sans nom d'entreprise, coordonnées ou identifiants.

### Champs STRICTEMENT INTERDITS (Blocklist)
- **`companyName`** (Nom d'entreprise)
- **`contactEmail` / Emails** (Adresses électroniques)
- **`sourceUrl` / URLs** (Liens web et adresses d'origine)
- **`companySiret` / `siret` / `siren`** (Données juridiques et identifiants d'entreprise)
- **`rawText`** (Texte brut non filtré)
- **`contactPhone` / Numéros de téléphone**
- **Identifiants internes de plateforme** (CUIDs, UUIDs, prefixes `usr_`, `job_`, `cand_`, `comp_`)
- **Métadonnées de traçabilité**

---

## 3. Authentification par En-tête et Journalisation Sécurisée

1. **En-tête HTTP `x-goog-api-key`** :
   L'API Gemini utilise l'en-tête HTTP `x-goog-api-key: GEMINI_API_KEY`. La clé d'API n'est **jamais passée dans l'URL**, évitant toute fuite dans les journaux de requêtes serveur.

2. **Journalisation Sans Fuite de Données** :
   - Les prompts, le texte des offres, les données personnelles et les clés d'API ne sont **jamais** journalisés.
   - Les erreurs réseau sont résumées par des messages génériques (ex. `Erreur de communication API (HTTP 500)`).

---

## 4. Activation en Environnement de Test

Pour tester Gemini localement :

```bash
# Variables d'environnement pour les tests uniquement
AI_PROVIDER=gemini
GEMINI_API_KEY=AIzaSy_VOTRE_CLE_DE_TEST_ICI
GEMINI_MODEL=gemini-1.5-flash
```

Commandes de vérification :
```bash
npm run typecheck
npm run build
node --import tsx --test tests/gemini-privacy-guardrails.test.ts
```

---

## 5. Non-Régression OpenAI

- **OpenAI** conserve son comportement d'origine pour l'analyse des CV réels et données privées.
- Si `AI_PROVIDER` n'est pas configuré sur `gemini`, le système utilise `openai` par défaut lorsqu'une `OPENAI_API_KEY` est disponible.
- En cas d'erreur ou d'épuisement de crédits OpenAI, le système **ne bascule JAMAIS automatiquement vers Gemini** pour des données candidates ou confidentielles.
