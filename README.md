# Recrutement Privé

Application SaaS de recrutement haut de gamme développée avec **Next.js 15**, **TypeScript**, **Tailwind CSS**, **Prisma**, **PostgreSQL** et **Auth.js**.

## Architecture par lots

- Lot 1 — fondations et page d’accueil premium
- Lot 2 — espaces métiers candidat, entreprise et consultant
- Lot 3 — socle Auth.js + Prisma/PostgreSQL

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
```

## Développement

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run typecheck
npm run build
npm run dev
```

Le Lot 3 utilise Auth.js avec une session JWT et un modèle Prisma `User` comprenant les rôles `CANDIDAT`, `ENTREPRISE`, `CONSULTANT` et `ADMIN`.

## Fonctionnalités prévues

### Site public
- Accueil
- Le Cabinet
- Entreprises
- Candidats
- Technologie
- Contact

### Espaces métiers
- Candidat : profil, candidatures, documents, messagerie
- Entreprise : missions, profils proposés, suivi des recrutements
- Consultant : CRM, pipeline, agenda, notes, reporting
- Administration : utilisateurs, contenus, statistiques et configuration

### Intelligence artificielle
L'IA assiste les consultants sans prendre les décisions de recrutement.
