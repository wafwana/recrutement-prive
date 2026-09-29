# Activation et Utilisation du Fournisseur IA Gemini Gratuit en Environnement de Test

Ce document décrit comment activer et tester le mode Gemini gratuit dans Recrutement Privé sans altérer les paramètres ni les données de production.

---

## 1. Principe de Fonctionnement

Le fournisseur **Gemini** est conçu comme une option gratuite réservée **strictement aux données non confidentielles, publiques ou fictives** (offres d'emploi publiques, données de test mockées).

### Garde-fous de Confidentialité Stricts (Pre-Network Blocking)
Avant tout appel réseau vers l'API Gemini (`generativelanguage.googleapis.com`), le système effectue des vérifications déclaratives ET une inspection dynamique du contenu (PII, numéros de téléphone, emails, mots-clés de CV, indicateurs de pseudonymisation, marqueurs de confidentialité d'entreprise) :
- **CV réels** : Bloqués à 100% (0 appel réseau).
- **Données candidates & PII** : Bloquées à 100% (0 appel réseau).
- **Données pseudonymisées** : Bloquées à 100% (la pseudonymisation n'est pas acceptée comme une anonymisation suffisante).
- **Offres confidentielles d'entreprise** : Bloquées à 100% (0 appel réseau).

L'intégration **OpenAI** conserve son fonctionnement inchangé pour tous les traitements nécessitant le traitement de CV réels ou de données confidentielles d'entreprise.

---

## 2. Activation en Environnement de Test

Pour activer Gemini lors d'un test local ou automatisé, définissez les variables d'environnement suivantes dans votre terminal ou votre fichier `.env.local` de test :

```bash
# Force l'utilisation du fournisseur Gemini au lieu d'OpenAI
AI_PROVIDER=gemini

# Clé API Gemini de test
GEMINI_API_KEY=AIzaSy_VOTRE_CLE_DE_TEST_ICI

# Modèle Gemini souhaité (optionnel, défaut: gemini-1.5-flash)
GEMINI_MODEL=gemini-1.5-flash
```

---

## 3. Exécution des Tests

Pour exécuter les tests spécifiques aux garde-fous de confidentialité et à l'interception réseau Gemini :

```bash
node --import tsx --test tests/gemini-privacy-guardrails.test.ts
```

---

## 4. Règles d'Exploitation & Sécurité Production

1. **Aucun basculement automatique** : Si `AI_PROVIDER` n'est pas explicitement égal à `gemini`, le système utilise `openai` par défaut lorsqu'une `OPENAI_API_KEY` est présente.
2. **Secrets de production inchangés** : Aucune variable ni secret de production Neon/Vercel ne doit être modifié pour l'activation de Gemini.
3. **Logs sécurisés** : Les corps d'erreur bruts de l'API Gemini, les prompts, les textes de CV/offres et les clés d'API ne sont **jamais** journalisés.
