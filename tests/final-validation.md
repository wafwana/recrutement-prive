# Validation finale — matrice des parcours

Cette matrice est la référence de la consolidation finale. Les scénarios automatisables doivent être exercés dans la CI contre PostgreSQL avec des comptes de test distincts. Les parcours visuels restent à vérifier sur une preview applicative réelle.

## Candidat
- Connexion avec compte CANDIDAT.
- Consultation de son profil.
- Modification du profil avec données valides.
- Rejet des données invalides par Zod.
- Consultation limitée à ses propres candidatures/documents.
- Un compte non-candidat reçoit 403 sur `/api/candidat/profil`.

## Entreprise
- Connexion avec compte ENTREPRISE.
- Compte mono-entreprise : accès sans `companyId`.
- Compte multi-entreprise : sélection explicite obligatoire.
- Accès à une entreprise non membre : 403.
- Création/modification d'offre.
- Archivage réservé à OWNER.
- Consultation des candidatures limitée à l'entreprise courante.
- Changement de statut et notes enregistré dans `RecruitmentHistory`.
- Une candidature d'une autre entreprise ne doit jamais être lisible ou modifiable.

## Consultant
- Connexion avec compte CONSULTANT.
- Accès au pipeline réel depuis PostgreSQL.
- Accès refusé aux comptes d'autres rôles.
- Vérifier que le consultant ne peut pas modifier les données entreprise/candidat par simple navigation ou appel d'API.

## Admin
- Connexion avec compte ADMIN.
- Accès au reporting global.
- Accès à la configuration.
- GET/PUT configuration avec validation Zod.
- Compte non-admin : 403 sur `/api/admin/settings`.
- Les paramètres persistés doivent être relus après rafraîchissement.

## Messagerie
- Utilisateur authentifié peut lister ses conversations.
- Création d'une conversation avec destinataire valide.
- Ajout d'un message dans une conversation existante.
- Lecture/marquage des messages.
- Utilisateur non participant : 403 sur lecture, écriture et marquage.
- Aucun message ne doit être visible par un tiers non participant.

## Sécurité transverse
- Routes `/espace/**` nécessitent une session.
- Chaque endpoint sensible vérifie le rôle et/ou l'appartenance réelle.
- Les identifiants de ressource ne doivent jamais permettre un contournement de l'isolation multi-entreprise.
- Toutes les écritures métier importantes doivent créer l'historique attendu.

## CI
- install
- Prisma generate
- Prisma migrate deploy
- seed de données de validation
- tests de validation métier/sécurité
- typecheck
- build

## Limite explicitement conservée
Cette suite prouve les règles métier et d'autorisation au niveau serveur/base. Elle ne remplace pas un audit navigateur visuel de la preview déployée.
