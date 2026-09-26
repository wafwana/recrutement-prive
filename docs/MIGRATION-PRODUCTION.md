# Guide d'Exécution des Migrations Neon Production

Ce document décrit la procédure sécurisée pour exécuter les migrations Prisma additives sur la base de données de production **Neon Postgres**, sans risquer d'échec de build Vercel ni exposer de chaîne de connexion secrète.

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

*Note : La valeur du secret est masquée et ne sera jamais affichée dans les logs d'exécution des workflows GitHub Actions.*

---

## 2. Déclenchement Manuel de la Migration Production

Une fois le secret configuré :

1. Sur GitHub, aller dans l'onglet **Actions**.
2. Dans le menu de gauche, sélectionner le workflow **Deploy Production Database Migrations**.
3. Cliquer sur le bouton **Run workflow** (à droite).
4. Dans le champ de confirmation `confirm_production`, saisir exactement :
   ```text
   CONFIRM_MIGRATE_PRODUCTION
   ```
5. Valider en cliquant sur **Run workflow**.

---

## 3. Ce que Fait le Workflow de Migration

Le workflow exécute la séquence sécurisée suivante :
1. Vérification de la confirmation textuelle `CONFIRM_MIGRATE_PRODUCTION`.
2. Vérification de la présence de la variable secrète `DATABASE_URL_PRODUCTION`.
3. Exécution de `npx prisma migrate deploy` :
   - Applique les migrations additives en attente (`0006_job_attachment`, `0018_cv_intelligence`, `0020_cv_intake_registry`, `0024_company_identity_and_sourcing_provenance`, `0025_external_offer_outreach`).
   - Crée les colonnes requises : `Job.attachmentName`, `CandidateDocument.folderPath`, `Company.siren`.
4. Exécution de `npx prisma migrate status` pour confirmer qu'aucun décalage de schéma ne persiste.

---

## 4. Recette Post-Migration & Confirmation OWNER

Une fois le workflow terminé au vert (icône coche verte) :

1. Se rendre sur **https://recrutement-prive.com/connexion**.
2. Connecter le compte `OWNER`.
3. Charger l'espace `/espace/owner` et vérifier le fonctionnement :
   - Fiches entreprises (champ `Company.siren`).
   - Fiches offres et pièces jointes (`Job.attachmentName`).
   - CVthèque et classification (`CandidateDocument.folderPath`).
4. Consulter l'onglet *Logs* Vercel Production pour confirmer la disparition totale des erreurs `P2022`.
