# Règles permanentes de développement — Recrutement Privé

Ces règles s'appliquent à tout agent, contributeur ou automatisation qui intervient dans ce dépôt. Elles complètent les instructions existantes ; en cas de conflit, préserver la sécurité, les données de production et la gouvernance OWNER prévaut.

## 1. Préserver le socle existant

- Recrutement Privé est une plateforme déjà largement développée. Toute demande nouvelle doit être traitée comme une évolution incrémentale, sauf preuve technique qu'une refonte ciblée est indispensable.
- Avant de coder, examiner les pages, composants, API, modèles Prisma, services, permissions et flux existants concernés.
- Réutiliser et étendre les systèmes existants. Ne pas créer une seconde CVthèque, un second moteur de matching/sourcing, des tables, routes, interfaces ou workflows parallèles lorsque les composants existants peuvent être adaptés.
- Ne pas remplacer, supprimer ou contourner une fonctionnalité existante sans nécessité démontrée et sans vérifier les dépendances et la non-régression.
- Si une fonction équivalente existe déjà, la compléter ou la corriger au lieu de la dupliquer.

## 2. Rattachement obligatoire des nouvelles options aux dossiers existants

- Toute nouvelle option, fonctionnalité, filtre, action ou évolution métier doit d'abord être rattachée au socle fonctionnel et au dossier/sous-dossier existant qui correspond à son usage.
- Rechercher d'abord la taxonomie, les secteurs, métiers, spécialités, dossiers et sous-dossiers déjà disponibles. Réutiliser leurs identifiants et leur hiérarchie, et brancher l'option sur les interfaces, API, données, permissions, historiques et flux existants concernés.
- Une nouvelle option ne doit pas devenir une plateforme, un module autonome, un moteur, une CVthèque, un vivier ou une interface parallèle lorsqu'elle peut être intégrée au système existant.
- Si aucun dossier ou sous-dossier pertinent n'existe réellement, créer le dossier et les sous-dossiers nécessaires de façon complète et cohérente, dans la hiérarchie existante. Cela inclut, selon le besoin, la taxonomie, la navigation, les droits d'accès, le rattachement des données, les états, l'historique, la recherche, le classement, les tests et les traductions prises en charge.
- Avant de créer un dossier ou sous-dossier, vérifier qu'il n'existe pas déjà sous un autre libellé, alias, synonyme ou identifiant. Préférer la réutilisation et la déduplication à la création de doublons.
- Si un dossier est créé, il doit être réellement utilisable de bout en bout : visible aux rôles autorisés, correctement relié aux données et aux actions existantes, couvert par les permissions serveur et les tests pertinents. Ne pas créer un simple dossier vide ou une entrée de navigation sans fonctionnement réel.
- Conserver une taxonomie cohérente : un élément peut avoir un métier principal et des spécialités secondaires, sans dupliquer le profil ou le CV. Préserver l'origine des données et permettre la correction humaine lorsque la classification est incertaine.

## 3. Priorité et périmètre

- Prioriser la résolution des travaux déjà engagés, des blocages de production et des régressions avant d'ajouter des évolutions secondaires.
- Avant de commencer, vérifier les issues, pull requests, branches et changements en cours liés au besoin ; identifier les travaux déjà réalisés, en cours, bloqués, obsolètes ou redondants.

### 3.1 Source de vérité obligatoire — correctifs déjà résolus

- Avant tout diagnostic ou codage, lire [le registre des correctifs validés](docs/operations/REGISTRE-CORRECTIFS-VALIDES.md). Ce registre est le checkpoint partagé entre agents et conversations pour éviter qu'un ancien problème soit traité comme encore bloqué.
- Un état de PR (**ouverte**, **fermée** ou **fusionnée**) ne suffit jamais à conclure qu'un défaut existe ou est résolu. Rechercher les PR de remplacement, commits de fusion, ancestry/diff avec `main`, code et tests actuels, puis SHA du déploiement de production.
- Lorsqu'un correctif est déjà intégré, testé et déployé, ne pas le réimplémenter, le cherry-pick à nouveau, ni créer une correction parallèle sans nouvelle preuve reproductible d'un défaut sur le SHA actuellement déployé.
- Si une PR ancienne est remplacée par une PR déjà fusionnée, la marquer explicitement comme **supersédée**, commenter le lien vers le correctif livré et la fermer quand cela est approprié. Ne pas la présenter comme un blocage actif.
- Mettre à jour le registre dans la même PR qui change l'état d'un sujet : statut, PR/commit, fichiers et tests de preuve, SHA de production et éventuels contrôles encore manquants. Séparer explicitement **code livré** et **fonctionnement réel en production vérifié**.
- Si une preuve manque, inscrire **non vérifié** et préciser l'action de vérification ; ne pas refaire le correctif par défaut. Avant chaque fusion, recontrôler que le `main` n'a pas avancé et que le diff de la PR ne réintroduit pas un correctif déjà livré.
- Respecter le cahier des charges et les décisions précédentes. Ne pas relancer un chantier à zéro ni abandonner silencieusement un travail en cours.
- Réaliser la demande de bout en bout dans le périmètre convenu : implémentation, tests, contrôles de sécurité, vérification de déploiement et validation fonctionnelle lorsque l'environnement le permet. Ne pas s'arrêter à un simple rapport ou à une moitié de solution.

## 4. OWNER, ADMIN, autorisations et données

- Ne jamais modifier, supprimer, rétrograder, réinitialiser ou compromettre le compte OWNER ni ses privilèges.
- Maintenir une séparation stricte entre OWNER et ADMIN. Un ADMIN ne doit pas pouvoir modifier les permissions OWNER, contourner les contrôles d'accès ou accéder aux données et fonctions réservées à OWNER.
- Les contrôles d'autorisation doivent être vérifiés côté serveur et échouer de manière restrictive (fail-closed). Ne pas se fier uniquement à la navigation ou aux contrôles d'interface.
- Préserver l'isolation entre entreprises, la confidentialité des candidats, les règles de consentement et les protections des données personnelles. Ne jamais exposer publiquement les coordonnées ou CV privés des candidats.
- Ne jamais inscrire de secrets, mots de passe, clés API ou données personnelles sensibles dans le code, les journaux, les commits ou les notifications.

## 5. Base de données, migrations et production

- Ne jamais lancer une migration de production ou une opération destructive avant d'avoir vérifié l'état réel du schéma, l'historique des migrations, les données concernées et la stratégie de récupération.
- Les migrations doivent être justifiées, minimales, compatibles avec les données existantes et accompagnées des contrôles appropriés. Ne pas créer de nouvelle table ou de nouveau modèle si un modèle existant peut répondre au besoin sans compromettre l'intégrité.
- Préserver les données de production et les points de restauration. Avant toute opération à risque, prévoir et vérifier une sauvegarde ou un point de restauration approprié.
- Ne pas déclarer une fonctionnalité opérationnelle sur la seule base d'une compilation ou d'un déploiement réussi : vérifier le parcours réel lorsque les accès le permettent.

## 6. Vérifications obligatoires avant livraison

- Examiner le diff et confirmer que les changements sont limités au besoin et ne dupliquent pas l'architecture.
- Exécuter les tests pertinents, le typecheck, le build et les contrôles CI disponibles ; ajouter ou adapter des tests de non-régression pour les parcours touchés.
- Vérifier explicitement les permissions OWNER/ADMIN, les contrôles d'accès serveur, l'isolation des données et les migrations si ces zones sont concernées.
- Pour les changements de production, distinguer clairement : code fusionné, CI validée, déploiement READY et parcours fonctionnel réellement testé.
- Ne jamais annoncer un test, une correction, une fusion, une sauvegarde ou une mise en production comme réussi sans preuve vérifiable. Indiquer précisément tout blocage restant et poursuivre sa résolution dans le périmètre autorisé.

## 7. Méthode de travail

- Préférer le changement minimal, réversible et testable qui complète le socle existant.
- Ne pas introduire de dépendance, de refonte, de migration ou de système parallèle sans justification technique concrète.
- Conserver les conventions, l'architecture, les composants, les permissions et les flux déjà établis.
- Si une décision indispensable est ambiguë, examiner d'abord le code et l'historique du dépôt ; ne demander une précision que si elle est réellement bloquante.
