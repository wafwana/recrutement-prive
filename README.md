# Recrutement Privé

Application SaaS de recrutement haut de gamme développée avec **Next.js 15**, **TypeScript**, **Tailwind CSS**, **Prisma**, **PostgreSQL** et **Auth.js**.

## Présentation

Recrutement Privé est une plateforme de recrutement moderne destinée aux entreprises, candidats et consultants.

L'objectif est de proposer une expérience premium en combinant :

- expertise humaine ;
- intelligence artificielle comme aide à la décision ;
- gestion complète du recrutement ;
- CRM intégré ;
- tableaux de bord métiers.

L'IA assiste les consultants mais ne prend jamais les décisions de recrutement.

## Stack technique

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL
- Auth.js
- Zod
- React Hook Form
- Framer Motion
- OpenAI API

## Fonctionnalités

### Site public

- Accueil
- Le Cabinet
- Entreprises
- Candidats
- Notre technologie
- Contact

### Espace Candidat

- Authentification
- Profil
- Dépôt de CV
- Candidatures
- Documents
- Messagerie

### Espace Entreprise

- Tableau de bord
- Dépôt d'offres
- Gestion des recrutements
- Profils proposés
- Messagerie

### Espace Consultant

- Dashboard
- CRM
- Gestion candidats
- Gestion entreprises
- Pipeline Kanban
- Agenda
- Notes
- Reporting

### Administration

- Gestion utilisateurs
- Gestion contenus
- Statistiques
- Logs
- Configuration

### Intelligence Artificielle

- Analyse des CV
- Extraction des compétences
- Résumé automatique
- Matching intelligent
- Suggestions d'entretien
- Classement des profils

## Architecture

```text
app/
components/
features/
lib/
prisma/
public/
services/
hooks/
types/
middleware.ts
```

## Installation

```bash
git clone https://github.com/wafwana/recrutement-prive.git
cd recrutement-prive
npm install
```

## Variables d'environnement

Créer un fichier `.env` :

```env
DATABASE_URL=
AUTH_SECRET=
OPENAI_API_KEY=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
```

## Développement

```bash
npm run dev
```

## Production

```bash
npm run build
npm start
```

## Déploiement

Le projet est prévu pour être déployé sur :

- Vercel
- Docker
- VPS Linux
- PostgreSQL

## Charte graphique

- Noir
- Or
- Blanc

Typographies :

- Playfair Display
- Inter

## Licence

Projet propriétaire.

Tous droits réservés © Recrutement Privé.
