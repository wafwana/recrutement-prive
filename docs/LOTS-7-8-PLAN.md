# Lots 7–8 — plan de consolidation et mise en production

## Lot 7 — expérience opérationnelle

Objectif : transformer les flux déjà persistés en parcours complets, sans réécrire les lots précédents.

- Candidat : consultation détaillée d'une candidature et de son historique.
- Entreprise : vue détaillée d'une candidature, actions de statut et historique auditable.
- Consultant : actions de pipeline, historique et vue de suivi cohérente avec les accès existants.
- Notifications : socle interne prêt pour les changements importants de candidature.
- Sécurité : conserver le contexte d'entreprise explicite et les contrôles de rôle.
- CI : conserver npm install, Prisma, typecheck et build comme garde-fous.

## Lot 8 — administration, préparation production et validation finale

- Administration : vue des utilisateurs, entreprises, offres et candidatures avec accès strictement protégé.
- Observabilité : pages de contrôle de santé et informations de configuration non secrètes.
- Documentation : variables d'environnement, migrations, seed et déploiement.
- Validation : CI complète sur les branches finales puis validation du parcours de production.
- Ne pas déclarer la plateforme terminée tant qu'une validation réelle de build et des flux principaux n'est pas obtenue.

## Règle de continuité

Les Lots 1–6 existants restent la base. Les nouveaux changements sont ajoutés par petites PR indépendantes et ne remplacent pas les fonctionnalités déjà validées.
