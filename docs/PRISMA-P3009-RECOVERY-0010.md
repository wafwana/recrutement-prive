# Récupération exceptionnelle Prisma P3009 — migration 0010

Cette procédure est réservée à la récupération ciblée de l’état P3009 de
`0010_mission_presentation_lock` en production. Elle n’est pas un déploiement
de migrations et ne doit être lancée qu’après vérification humaine de l’état
réel du schéma et de la migration.

Le workflow manuel exige la saisie exacte de
`CONFIRM_RESOLVE_0010_PRODUCTION`, vérifie la présence du seul secret
`DATABASE_URL_PRODUCTION` sans en afficher la valeur, puis affiche
`prisma migrate status` avant et après l’action.

L’unique commande de modification autorisée est :

`npx prisma migrate resolve --applied 0010_mission_presentation_lock`

Le workflow ne lance pas `migrate deploy`, `db push`, `migrate reset`,
`resolve --rolled-back`, ni aucune commande SQL destructive. La cible est
codée en dur et ne peut pas être fournie par un paramètre. Aucun compte, rôle,
permission ou identifiant OWNER n’est modifié.

Ne pas exécuter si les objets attendus par la migration n’ont pas déjà été
contrôlés dans la base de production. Toute autre migration nécessite une
procédure distincte, revue et approuvée.
