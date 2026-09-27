# Procédure de récupération P3009 — migration 0010

## Principe
La migration `0010_mission_presentation_lock` peut être résolue comme appliquée uniquement après validation **lecture seule** de l'ensemble du schéma créé par son SQL.

Le validateur vérifie les deux enums avec leurs valeurs et ordre, les trois colonnes `Job`, les onze colonnes de `MissionPresentation`, sa clé primaire, exactement les trois index définis par la migration (dont un unique), et exactement les quatre clés étrangères avec leurs règles CASCADE/CASCADE.

Une divergence provoque un échec sans écriture. Aucune résolution `rolled_back` n'est effectuée.

## Exécution production
Ne pas lancer automatiquement cette procédure après fusion. La sauvegarde Neon existante `backup-pre-owner-fix-2026-09-26` reste la sauvegarde de référence.

1. Déclencher manuellement **Verify & Recover Prisma Production Migrations**.
2. Choisir `CONFIRM_MIGRATE_PRODUCTION`.
3. La première étape exécute uniquement le validateur read-only.
4. Si et seulement si cette étape est verte, une résolution `0010` peut être autorisée avec `CONFIRM_RESOLVE_0010_APPLIED`.
5. Le workflow exécute ensuite `prisma migrate deploy`, puis `prisma migrate status`.
6. Après succès, effectuer la recette réelle de connexion OWNER sur production et vérifier `/espace/owner`.

## Retour arrière
Le correctif Git est réversible par revert. **Ne pas** tenter de "rollback" 0010 avec `migrate resolve --rolled-back` si son schéma est déjà présent : cela ne supprime pas les objets et peut permettre à Prisma de réexécuter un SQL déjà appliqué. Pour une anomalie de données, utiliser la procédure de restauration Neon appropriée, hors de ce workflow.

## Important
Le job de précontrôle ne divulgue jamais `DATABASE_URL_PRODUCTION`. Le secret est consommé via l'environnement GitHub Actions et n'est pas imprimé.
