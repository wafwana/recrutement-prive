# Guide d'Exécution des Migrations Neon Production & Résolution P3009

Ce document décrit la procédure sécurisée pour exécuter les migrations Prisma additives sur la base de données de production **Neon Postgres** et résoudre le blocage de migration **Prisma P3009** (`0010_mission_presentation_lock`).

---

## 1. Préalable Obligatoire : Configuration du Secret GitHub

Afin de permettre l'exécution automatisée des migrations hors du build Vercel :

1. Se rendre sur le dépôt GitHub `wafwana/recrutement-prive`.
2. Aller dans **Settings** > **Secrets and variables** > **Actions**.
3. Cliquer sur **New repository secret**.
4. Renseigner les champs :
   - **Name :** `DATABASE_URL_PRODUCTION`
   - **Secret :** Coller la chaîne de connexion PostgreSQL de production Neon (`postgresql://...`).
5. Cliquer sur **Add secret**.

---

## 2. Procédure de Résolution du Blocage P3009 (`0010_mission_presentation_lock`)

La migration `0010_mission_presentation_lock` a été interrompue précédemment sur la base de production et présente le statut **P3009** (*Failed migration*).

### Étape 1 : Choisir le Mode de Résolution selon l'État PostgreSQL Real
- **Si les tables `MissionPresentation` et les colonnes `Job.financialConditionStatus` existent déjà dans PostgreSQL :**
  Sélectionner le mode **`applied`**. Cela exécutera `npx prisma migrate resolve --applied "0010_mission_presentation_lock"`, enregistrant la migration 0010 comme complétée sans altérer les tables existantes.
- **Si les tables/colonnes de la migration 0010 n'existent pas encore dans PostgreSQL :**
  Sélectionner le mode **`rolled_back`**. Cela exécutera `npx prisma migrate resolve --rolled-back "0010_mission_presentation_lock"`, permettant à `prisma migrate deploy` de rejouer la migration 0010.

---

## 3. Déclenchement du Workflow de Migration sur GitHub

1. Sur GitHub, aller dans l'onglet **Actions**.
2. Dans le menu de gauche, sélectionner **Deploy Production Database Migrations**.
3. Cliquer sur **Run workflow** (bouton à droite).
4. Saisir les paramètres :
   - **`confirm_production` :**
     ```text
     CONFIRM_MIGRATE_PRODUCTION
     ```
   - **`resolve_migration_mode` :** `applied` (ou `rolled_back` selon votre diagnostic PostgreSQL).
5. Cliquer sur **Run workflow**.

---

## 4. Déroulement Automatique du Workflow

Le workflow exécute la séquence sécurisée suivante :
1. Résolution de la migration 0010 selon le mode sélectionné (`npx prisma migrate resolve`).
2. Exécution de `npx prisma migrate deploy` pour appliquer toutes les migrations additives ultérieures (`0011` à `0025`), créant ainsi les colonnes manquantes `Company.siren`, `Job.attachmentName` et `CandidateDocument.folderPath`.
3. Exécution de `npx prisma migrate status` pour vérifier l'alignement à 100% du schéma.

---

## 5. Recette Post-Migration & Confirmation OWNER

Une fois le workflow validé au vert (coche verte) :

1. Aller sur **https://recrutement-prive.com/connexion**.
2. S'authentifier avec le compte `OWNER`.
3. Accéder à l'espace `/espace/owner` et vérifier le chargement des sections entreprises, offres et CVthèque.
4. Consulter l'onglet *Logs* Vercel Production pour confirmer la disparition de l'erreur `P2022`.
