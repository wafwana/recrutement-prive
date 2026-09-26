# Guide d'Exécution des Migrations Neon Production & Précontrôle P3009

Ce document décrit la procédure sécurisée pour exécuter les migrations Prisma additives sur la base de données de production **Neon Postgres** et débloquer automatiquement l'erreur **Prisma P3009** (`0010_mission_presentation_lock`).

---

## 1. Garde-fous et Précontrôle Automatique (`scripts/check-migration-0010.ts`)

Le workflow intègre une étape de précontrôle automatique d'introspection de la base de données PostgreSQL (`information_schema`, `pg_type`) qui analyse :
- L'existence de l'enregistrement dans `_prisma_migrations`.
- La présence des 2 types ENUM (`MissionPresentationState`, `FinancialConditionStatus`).
- La présence des 3 colonnes de `Job` (`missionType`, `financialCondition`, `financialConditionStatus`).
- La présence de la table `MissionPresentation`.
- La présence des 3 colonnes de déblocage OWNER (`Company.siren`, `Job.attachmentName`, `CandidateDocument.folderPath`).

### Classification et Blocage Sécurisé :
- **Si l'état est `PARTIAL`** (seuls certains objets existent), le script interrompt immédiatement le workflow avec un message d'erreur clair sans modifier la base de données.
- **Si `resolve_migration_mode = applied` est demandé mais que l'état n'est pas `COMPLETE`**, le script bloque l'exécution.
- **Si `resolve_migration_mode = rolled_back` est demandé mais que des objets existent déjà**, le script bloque l'exécution pour éviter un échec SQL lors de la réexécution.

---

## 2. Préalable Obligatoire : Configuration du Secret GitHub

1. Se rendre sur le dépôt GitHub `wafwana/recrutement-prive`.
2. Aller dans **Settings** > **Secrets and variables** > **Actions**.
3. Cliquer sur **New repository secret**.
4. Renseigner les champs :
   - **Name :** `DATABASE_URL_PRODUCTION`
   - **Secret :** Coller la chaîne de connexion PostgreSQL de production Neon (`postgresql://...`).
5. Cliquer sur **Add secret**.

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
   - **`resolve_migration_mode` :**
     - Choisir **`applied`** si la table `MissionPresentation` et les ENUMs existent déjà dans la base.
     - Choisir **`rolled_back`** si aucun objet de la migration 0010 n'existe dans la base.
     - Choisir **`none`** si aucune résolution P3009 n'est requise.
5. Cliquer sur **Run workflow**.

---

## 4. Déroulement et Post-Vérification

Le workflow s'exécute de façon séquentielle :
1. **Script de précontrôle** : Valide l'état de la base PostgreSQL.
2. **Résolution P3009** : Exécute `prisma migrate resolve` uniquement si les conditions de sécurité sont remplies.
3. **Déploiement des migrations** : Exécute `prisma migrate deploy` pour appliquer les migrations additives ultérieures (`0011` à `0025`).
4. **Post-vérification** : Contrôle la présence effective de `Company.siren`, `Job.attachmentName` et `CandidateDocument.folderPath`.

---

## 5. Recette Post-Migration & Confirmation OWNER

Une fois le workflow terminé au vert (coche verte) :
1. Aller sur **https://recrutement-prive.com/connexion**.
2. S'authentifier avec le compte `OWNER`.
3. Accéder à l'espace `/espace/owner` et vérifier le chargement des sections entreprises, offres et CVthèque.
4. Consulter l'onglet *Logs* Vercel Production pour confirmer la disparition de l'erreur `P2022`.
