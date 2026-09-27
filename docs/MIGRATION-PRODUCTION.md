# Migrations Prisma — production Neon

Le build Vercel ne lance pas de migration de production. Les migrations production sont exécutées uniquement par des workflows GitHub Actions manuels, limités à la branche `main`, avec confirmations exactes et concurrence sérialisée.

## Récupération P3009 — 0010_mission_presentation_lock

La migration 0010 ne doit jamais être résolue comme appliquée uniquement parce que PostgreSQL a répondu 42710.

Le workflow `Verify & Recover Prisma Production Migrations` exige deux confirmations explicites :
- `CONFIRM_MIGRATE_PRODUCTION`
- `CONFIRM_RESOLVE_0010_APPLIED`

Après ces confirmations, il exécute un précontrôle lecture seule avec `scripts/check-migration-0010.ts`.

Le précontrôle vérifie exactement :
- les deux enums et leurs valeurs ;
- les trois colonnes ajoutées à `Job`, avec type, nullabilité et défaut ;
- les onze colonnes de `MissionPresentation`, avec type, nullabilité et défaut ;
- la clé primaire sur `id` ;
- exactement les trois index définis par la migration 0010. L'index physique créé par la clé primaire est exclu du comptage ;
- les quatre clés étrangères avec colonnes, tables/colonnes référencées et règles `ON DELETE` / `ON UPDATE` ;
- une seule ligne de migration Prisma pour `0010_mission_presentation_lock`, sans état `rolled_back`.

Une divergence, une absence ou une ambiguïté provoque un échec sans modification automatique du schéma.

Le précontrôle exige également que les migrations préalables
`0011_password_reset_token`, `0012_job_category`,
`0013_connect_job_category` et `0014_candidate_subcategories`
possèdent chacune une unique ligne réussie et non annulée dans
`_prisma_migrations`. Si leur historique est absent ou ambigu, le workflow
s'arrête avant toute résolution ou déploiement. Il faut alors utiliser d'abord le workflow manuel
`Reconcile Prisma migration history 0011-0014 (Production - Manual)`, avec
la confirmation exacte `CONFIRM_RECONCILE_0011_0014_PRODUCTION`. Il valide en
lecture seule les colonnes, types, nullabilité, défauts, clés, index et clés
étrangères des objets créés par ces quatre migrations. Si tout correspond, il
marque uniquement les migrations manquantes comme appliquées dans
`_prisma_migrations`; il ne lance aucune migration SQL et ne modifie aucune
donnée métier. Il est idempotent et vérifie l'état final. Une divergence ou un
état d'échec/annulation bloque l'opération.

Ne pas laisser `migrate deploy` rejouer ces migrations à l'aveugle, car
certaines créent des tables ou colonnes déjà existantes. Après réussite de la
réconciliation 0011-0014, relancer le workflow de récupération 0010 avec ses
deux confirmations explicites.
1. `npx tsx scripts/recover-migration-0010.ts` (vérifie à nouveau le schéma et l'historique, résout uniquement 0010 si elle est en échec, et saute la résolution si elle est déjà appliquée).
2. `npx prisma migrate deploy`
3. `npx prisma migrate status`
4. une seconde validation lecture seule de 0010.

## Secret de production

Le workflow utilise exclusivement `secrets.DATABASE_URL_PRODUCTION`, injecté uniquement dans l'environnement des étapes concernées. La valeur n'est jamais affichée.

## Concurrence et retour arrière

Le workflow est sérialisé avec une clé de concurrence dédiée et `cancel-in-progress: false`.

Ne pas utiliser `prisma migrate reset`, `prisma db push`, SQL destructif, suppression/recréation d'objets, ni `migrate resolve --rolled-back` pour contourner P3009.

Le correctif Git est réversible par revert. Pour une restauration de données, utiliser la procédure Neon appropriée avec la sauvegarde existante `backup-pre-owner-fix-2026-09-26`.

## Vérification OWNER

Une migration verte ne prouve pas que l'OWNER fonctionne en production.

Après exécution contrôlée, vérifier réellement :
- la connexion sur `/connexion` avec le compte OWNER existant ;
- le chargement de `/espace/owner` ;
- l'accès aux données de pilotage attendues ;
- l'absence d'erreurs de schéma/authentification dans les logs Vercel Production.

Le flux d'authentification est : formulaire de connexion -> route Auth.js Credentials -> normalisation de l'email -> recherche Prisma dans `User` -> vérification du hash scrypt -> JWT contenant notamment `sub` et `role` -> session serveur. La page OWNER et les routes OWNER réévaluent ensuite le rôle côté serveur.
