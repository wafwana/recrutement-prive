# Guide d'Exécution des Migrations Neon Production & Précontrôle P3009

Ce document décrit la procédure sécurisée pour exécuter les migrations Prisma additives sur la base de données de production **Neon Postgres** et débloquer automatiquement l'erreur **Prisma P3009** (`0010_mission_presentation_lock`).

---

## 1. Principes d'Isolation Vercel & Non-Exécution dans le Build

Afin de garantir que la compilation statique et les Previews Vercel ne dépendent pas d'une chaîne `DATABASE_URL` active lors du build :
- Le script `npm run build` dans `package.json` est strictement restreint à :
  ```json
  "build": "prisma generate && next build"
  ```
- Les migrations de production sont complètement découplées du build Vercel et s'exécutent hors-bande via le workflow GitHub Actions dédié `.github/workflows/deploy-migrations.yml`.

---

## 2. Garde-fous et Précontrôle Automatique d'Isolation (`scripts/check-migration-0010.ts`)

Le workflow intègre un script de précontrôle automatique d'introspection de la base de données PostgreSQL (`information_schema`, `pg_type`, `pg_enum`, `pg_indexes`, `pg_constraint`) restreint au schéma `public` qui analyse :
- L'existence de l'enregistrement dans `_prisma_migrations`.
- La présence des 2 types ENUM (`MissionPresentationState`, `FinancialConditionStatus`).
- La présence des 3 colonnes de `Job` (`missionType`, `financialCondition`, `financialConditionStatus`).
- La présence de la table `MissionPresentation` (12 colonnes, types, nullabilité).
- La présence des 4 index et 4 contraintes de clés étrangères.
- La présence des 3 colonnes de déblocage OWNER (`Company.siren`, `Job.attachmentName`, `CandidateDocument.folderPath`).

### Classification et Blocage Sécurisé :
- **Si une erreur SQL survient** lors de la lecture d'une table d'introspection, le script échoue immédiatement (`ERROR`) pour empêcher toute fausse interprétation.
- **Si l'état est `PARTIAL`** (seuls certains objets existent), le script interrompt le workflow sans modifier la base.
- **Si `resolve_migration_mode = applied` est demandé mais que l'état n'est pas `COMPLETE`**, le script bloque l'exécution.
- **Si `resolve_migration_mode = rolled_back` est demandé mais que des objets existent ou que la migration n'a pas échoué**, le script bloque l'exécution.

*Avertissement : Les tests unitaires sandbox valident le fonctionnement du script et des garde-fous sur des mocks PostgreSQL. Ils ne constituent pas une preuve de réparation de la base de production réelle tant que le workflow n'est pas exécuté avec `DATABASE_URL_PRODUCTION`.*

---

## 3. Préalable Obligatoire : Configuration du Secret GitHub

1. Se rendre sur le dépôt GitHub `wafwana/recrutement-prive`.
2. Aller dans **Settings** > **Secrets and variables** > **Actions**.
3. Cliquer sur **New repository secret**.
4. Renseigner les champs :
   - **Name :** `DATABASE_URL_PRODUCTION`
   - **Secret :** Coller la chaîne de connexion PostgreSQL de production Neon (`postgresql://...`).
5. Cliquer sur **Add secret**.

---

## 4. Déclenchement du Workflow de Migration sur GitHub

1. Sur GitHub, aller dans l'onglet **Actions**.
2. Dans le menu de gauche, sélectionner **Deploy Production Database Migrations**.
3. Cliquer sur **Run workflow** (bouton à droite).
4. Saisir les paramètres :
   - **`confirm_production` :**
     ```text
     CONFIRM_MIGRATE_PRODUCTION
     ```
   - **`resolve_migration_mode` :**
     - Choisir **`applied`** si la table `MissionPresentation` et les ENUMs existent déjà dans le schéma `public`.
     - Choisir **`rolled_back`** si aucun objet de la migration 0010 n'existe dans le schéma `public` et que l'enregistrement `0010` est en échec.
     - Choisir **`none`** si aucune résolution P3009 n'est requise.
5. Cliquer sur **Run workflow**.

---

## 5. Déroulement et Post-Vérification

Le workflow s'exécute de façon séquentielle :
1. **Script de précontrôle** : Valide l'état du schéma `public`.
2. **Résolution P3009** : Exécute `prisma migrate resolve` uniquement si les conditions de sécurité sont remplies.
3. **Déploiement des migrations** : Exécute `prisma migrate deploy` pour appliquer les migrations additives ultérieures (`0011` à `0025`).
4. **Post-vérification** : Contrôle la présence effective de `Company.siren`, `Job.attachmentName` et `CandidateDocument.folderPath`.

---

## 6. Recette Post-Migration & Confirmation OWNER

Une fois le workflow validé au vert (coche verte) :
1. Aller sur **https://recrutement-prive.com/connexion**.
2. S'authentifier avec le compte `OWNER`.
3. Accéder à l'espace `/espace/owner` et vérifier le chargement des sections entreprises, offres et CVthèque.
4. Consulter l'onglet *Logs* Vercel Production pour confirmer la disparition de l'erreur `P2022`.
