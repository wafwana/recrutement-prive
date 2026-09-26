# Recrutement Privé

Application SaaS de recrutement haut de gamme développée avec **Next.js 15**, **TypeScript**, **Tailwind CSS**, **Prisma**, **PostgreSQL** et **Auth.js**.

## Architecture par lots

- Lot 1 — fondations et page d’accueil premium
- Lot 2 — espaces métiers candidat, entreprise et consultant
- Lot 3 — socle Auth.js + Prisma/PostgreSQL
- Lot 4 — cockpit Owner, pilotage et prestations/tarifs

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

## Variables d'environnement

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="..."
OPENAI_API_KEY="..."
OWNER_EMAIL="owner@votre-domaine.fr"
OWNER_PASSWORD="mot-de-passe-fort-et-unique"
OWNER_NAME="Owner Recrutement Privé"
```

`OWNER_EMAIL` et `OWNER_PASSWORD` sont utilisés uniquement par `prisma db seed` pour provisionner le premier Owner. Le seed refuse de créer un second Owner si un Owner existe déjà.

## Développement

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run typecheck
npm run build
npm run dev
```

Le système Auth.js utilise une session JWT et le modèle Prisma `User` comprend les rôles `CANDIDAT`, `ENTREPRISE`, `CONSULTANT`, `ADMIN` et `OWNER`.

## Fonctionnalités prévues

### Site public
- Accueil
- Le Cabinet
- Entreprises
- Candidats
- Technologie
- Contact

### Espaces métiers
- Owner : cockpit global, supervision, pilotage, prestations et tarifs
- Candidat : profil, candidatures, documents, messagerie
- Entreprise : missions, profils proposés, suivi des recrutements
- Consultant : CRM, pipeline, agenda, notes, reporting
- Administration : utilisateurs, contenus, statistiques et configuration

### Intelligence artificielle
L'IA assiste les consultants sans prendre les décisions de recrutement.
