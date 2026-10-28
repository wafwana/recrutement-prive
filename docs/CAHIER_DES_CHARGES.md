# Cahier des charges maître — Recrutement Privé

> **Complément fonctionnel et technique (16 octobre 2026) :** le périmètre produit, les rôles, les intégrations, les scripts et les critères d’acceptation sont détaillés dans le [cahier des charges fonctionnel](CAHIER_DES_CHARGES_FONCTIONNEL.md). Le présent document reste la référence pour la gouvernance et le processus A → Z.

> **Règle d'ouverture obligatoire : exécution de bout en bout, preuves alignées et source de vérité unique.**  
> Toute tâche, correction, option ou mise en production commence par ce processus et ne peut être déclarée terminée sur la seule base d'un rapport, d'une compilation ou d'un déploiement réussi.

## 1. Processus obligatoire d'exécution et de validation (à appliquer en premier)

### 1.1 Une référence technique unique

Au début de chaque intervention, relever et consigner :
- le dépôt et la branche de référence ;
- le SHA exact de `main` ;
- la branche/PR de travail et son SHA ;
- les résultats CI/tests associés à ce SHA ;
- le SHA réellement déployé en production et l'état Vercel ;
- les contrôles fonctionnels réalisés sur la production, avec résultat et date.

Les statuts GitHub, CI, Vercel et production doivent être comparés à des SHA explicites. Si les SHA diffèrent, l'écart doit être expliqué et la validation reprise sur la version effectivement concernée. Une déclaration « débloqué » provenant d'un outil n'est jamais suffisante à elle seule.

### 1.2 Exécution A → Z, sans arrêt à mi-parcours

Pour chaque demande, l'agent chargé de l'exécution doit :
1. comprendre le besoin et le rattacher au présent cahier des charges ainsi qu'aux exigences existantes ;
2. inspecter l'implémentation actuelle, les PR, branches, workflows, journaux et dépendances concernés ;
3. identifier les changements manquants et les blocages concrets ;
4. corriger le problème dans la branche de travail, en réutilisant le socle existant ;
5. ajouter ou mettre à jour les tests de non-régression et de sécurité ;
6. exécuter les vérifications disponibles : CI, tests ciblés, typecheck, build, contrôles de migrations et permissions ;
7. résoudre les échecs puis recommencer les contrôles concernés jusqu'à obtenir un résultat valide, ou jusqu'à une limite externe clairement démontrée ;
8. faire relire les changements, vérifier le diff et l'absence de régression, puis ouvrir/mettre à jour une PR ;
9. attendre les contrôles requis avant fusion ; ne jamais contourner un contrôle rouge ou inconnu ;
10. après fusion, vérifier que Vercel a déployé le SHA de fusion attendu et que l'environnement cible est `READY` ;
11. exécuter les smoke tests fonctionnels en production sur les parcours concernés ;
12. consigner les preuves, le SHA final, les résultats et les éventuels blocages résiduels dans un état unique et compréhensible.

Il est interdit de s'arrêter après une étape intermédiaire en demandant à l'utilisateur de relancer un autre interlocuteur pour terminer la suite. Continuer automatiquement les étapes réalisables et traiter chaque blocage par : **constat précis → tentative de résolution → nouvelle vérification → poursuite du processus**. Si une action exige réellement un accès, un secret, une identité de test ou une approbation que l'agent ne possède pas, effectuer tout le reste et signaler uniquement ce blocage externe avec la preuve et l'action minimale attendue.

### 1.3 États normalisés — ne jamais les confondre

Chaque tâche reçoit un état explicite :
- **À faire** : pas encore exécutée.
- **En cours** : modifications en cours.
- **Bloquée** : obstacle précis, prouvé, avec prochaine action.
- **Corrigée** : changement réalisé, mais pas encore validé.
- **Testée** : contrôles techniques réussis sur le SHA indiqué.
- **Fusionnée** : changement présent dans la branche de référence.
- **Déployée** : SHA attendu déployé et déploiement `READY`.
- **Vérifiée en production** : parcours réel testé avec résultat observé.
- **Terminée** : toutes les preuves requises sont réunies ; aucun blocage critique restant.

Un déploiement `READY` prouve que Vercel a terminé le déploiement ; il ne prouve pas, à lui seul, que la fonctionnalité marche. De même, une CI verte ne prouve pas le fonctionnement réel en production. Ne jamais annoncer « tout est terminé » sans les preuves adaptées au périmètre.

### 1.4 Preuves minimales de clôture

Pour chaque livraison, conserver :
- lien PR et commit de fusion ;
- statut des contrôles CI et tests, rattachés au SHA ;
- typecheck/build et tests ciblés pertinents ;
- vérification des migrations et de la compatibilité de schéma, sans migration risquée non réconciliée ;
- contrôle sécurité, permissions et non-régression ;
- identifiant/SHA du déploiement de production et état Vercel ;
- résultats des smoke tests réels, ou blocage externe explicitement identifié ;
- état final et liste courte des seuls points non résolus.

En cas d'absence de preuve, écrire **non vérifié**. Ne jamais transformer une supposition, un ancien résultat ou un rapport d'un autre outil en confirmation actuelle.

### 1.5 Communication courte, centralisée et sans contradiction

Maintenir une seule synthèse opérationnelle de référence pour une tâche. Éviter les audits répétitifs et les demandes de confirmation déjà couvertes par le cahier des charges. Ne transmettre à l'utilisateur que :
- ce qui a effectivement changé ;
- les preuves de validation ;
- le statut final ;
- les éventuels blocages qui nécessitent réellement son intervention.

GitHub/CI, Vercel et les tests de production sont des sources complémentaires, pas des avis concurrents : comparer leurs résultats pour le même SHA et expliquer tout écart avant de conclure.
Le registre partagé [des correctifs validés et travaux restants](operations/REGISTRE-CORRECTIFS-VALIDES.md) doit être consulté au début de chaque intervention et mis à jour avec les preuves de toute nouvelle résolution. Une ancienne PR ouverte n'est pas, à elle seule, la preuve d'un blocage.

## 2. Socle existant et règle de non-régression

- Améliorer et étendre l'application existante ; ne pas redémarrer le projet ni créer une plateforme parallèle.
- Toute fonctionnalité nouvelle est une option rattachée au socle sain, à l'architecture, aux données, aux parcours et aux permissions déjà en place.
- Inspecter les implémentations et branches existantes avant de réécrire. Récupérer sélectivement les changements utiles des branches anciennes ; ne pas fusionner aveuglément une branche en retard.
- Préserver les parcours fonctionnels, les données, l'historique, la provenance et les intégrations existantes.
- Avant une fusion ou une opération de données à risque, définir un point de restauration approprié et vérifier la possibilité de retour arrière.

## 3. Protection absolue du compte OWNER et sécurité des rôles

- Ne jamais modifier, remplacer, supprimer, rétrograder, verrouiller ou recréer le compte OWNER existant.
- Préserver les rôles OWNER, ADMIN, CANDIDAT, ENTREPRISE et CONSULTANT, ainsi que les contrôles d'accès et l'isolation entre entreprises.
- ADMIN ne peut ni modifier les droits OWNER, ni accéder aux données réservées au OWNER.
- Les autorisations sensibles sont vérifiées côté serveur et échouent de manière fermée (*fail-closed*).
- Ne jamais exposer de secrets, clés API, mots de passe, tokens ou données personnelles dans les journaux, rapports ou interfaces.

## 4. Données, migrations et production

- Vérifier le schéma réel et l'état des migrations avant toute migration de production.
- En cas de divergence ou d'échec Prisma, commencer par un diagnostic en lecture seule, comparer le schéma attendu au schéma réel, prévoir une sauvegarde/restore point et réconcilier avant toute action modificatrice.
- Ne jamais déclarer une migration appliquée sur la seule base d'un fichier ou d'un workflow lancé.
- Distinguer Preview, Production, branche déployée et domaine effectivement testé.
- Vérifier les fonctionnalités avec des parcours représentatifs et, lorsque nécessaire, des identités de test distinctes pour les rôles concernés.

## 5. Périmètre et confidentialité métier

- Réutiliser la CVthèque, le vivier, le matching, le sourcing, la taxonomie, les dossiers et les mécanismes de permissions existants.
- Ne pas exposer publiquement les coordonnées des candidats.
- Ne pas contacter automatiquement un candidat, créer un compte ou partager un profil avec une entreprise sans le parcours d'autorisation prévu.
- Toute classification automatique doit conserver la provenance et les éléments qui la justifient ; les cas de confiance faible restent à qualifier.
- Les résultats de sourcing doivent refléter les sources réellement interrogées et signaler les erreurs ou limites. Ne jamais inventer de candidats, d'analyses ou de résultats.

## 6. Stack et intégrations de référence

Le projet utilise notamment Next.js App Router, TypeScript, React, Tailwind CSS, Prisma, PostgreSQL/Neon, Auth.js, GitHub Actions et Vercel. Vérifier les versions et intégrations réellement présentes dans le dépôt avant toute modification ; cette liste ne justifie pas l'ajout d'un service ou d'une dépendance sans nécessité.

## 7. Définition de « terminé »

Une tâche n'est terminée que lorsque le besoin est implémenté sur le socle existant, les contrôles pertinents passent, les protections OWNER/ADMIN et les non-régressions sont vérifiées, le changement est fusionné et déployé sur le SHA attendu, et les parcours de production concernés sont testés. Tout point non testable faute d'accès est déclaré explicitement **bloqué par accès externe** et ne doit pas être présenté comme validé.


## 8. Registre de suivi maître, sans oubli ni doublon

Le registre opérationnel partagé `docs/operations/REGISTRE-CORRECTIFS-VALIDES.md` est la liste de suivi unique des correctifs, livraisons et tests restant à faire. Le registre GitHub de clôture finale ([issue #325](https://github.com/wafwana/recrutement-prive/issues/325)) sert d'index de pilotage des tickets ; il ne remplace pas le registre versionné.

Pour chaque action, tenir une ligne unique avec : identifiant stable, domaine, ticket/PR/commit, SHA contrôlé, statut, preuve technique, SHA de production et déploiement si confirmés, test OWNER restant, résultat/date et éventuel blocage. Avant d'ajouter un travail, rechercher dans le registre et dans les PR récentes pour éviter les doublons et ne pas refaire un correctif déjà livré.

Statuts obligatoires, à ne jamais confondre :
- [ ] **À faire** — non commencé.
- [ ] **En cours** — exécution active sur branche dédiée.
- [ ] **Bloqué** — obstacle précis, preuve et prochaine action indiqués.
- [ ] **Corrigé** — changement présent sur la branche, validation incomplète.
- [ ] **Contrôles techniques réussis** — tests pertinents, CI, typecheck/build et contrôles sécurité/OWNER vérifiés sur le SHA cité.
- [ ] **Fusionné** — PR fusionnée dans `main`, avec lien et SHA de fusion.
- [ ] **Déployé** — SHA de fusion exact identifié dans le déploiement de production et état READY confirmé.
- [ ] **À tester par l’OWNER** — action utilisateur concrète, courte et reproductible fournie.
- [ ] **Validé en production** — résultat d'un test réel consigné, avec date et environnement.
- [ ] **Terminé** — toutes les preuves requises réunies ; aucun blocage critique restant.

Une case ne peut être cochée que sur preuve. Une PR fusionnée ne vaut pas validation de production. Un déploiement READY ne prouve pas le bon fonctionnement métier. Si un contrôle n'est pas accessible, inscrire **non vérifié** et préciser exactement ce qui manque.

### Mode de livraison
Les corrections sans risque connu peuvent être fusionnées dès que le diff, les contrôles techniques, les droits, la non-régression et la compatibilité OWNER sont vérifiés ; les essais d'usage qui nécessitent le compte OWNER sont alors listés pour l'utilisateur après déploiement. Ne pas bloquer inutilement une correction sûre uniquement parce que le test utilisateur final doit être effectué par l'OWNER.

Bloquer en revanche toute fusion/activation présentant un risque non maîtrisé pour les données, les permissions, la confidentialité, le compte OWNER, les migrations ou la disponibilité. Toute migration de production exige diagnostic préalable en lecture seule, sauvegarde/point de restauration vérifié et autorisation explicite.

Le rapport final doit montrer seulement les actions réellement restantes pour l'OWNER, avec cases à cocher, étapes concrètes et résultat attendu. Le suivi des livraisons et le suivi des tests utilisateur restent liés par le même identifiant pour ne créer ni oubli ni doublon.


## 9. Boucle obligatoire de retour utilisateur et déblocage

Tout cahier des charges nouveau ou révisé doit intégrer dès le départ le registre de suivi, les statuts, les critères d'acceptation et la procédure de retour utilisateur ci-dessous. Cette règle s'applique à chaque nouveau projet et à chaque cahier des charges, pas seulement à Recrutement Privé.

Lorsqu'un utilisateur effectue un test après déploiement et signale qu'une action ne fonctionne pas :
1. enregistrer son retour dans la ligne de suivi de l'action existante, avec la date, l'environnement, le parcours, le résultat observé et le résultat attendu ;
2. faire passer cette action au statut **Échec du test utilisateur — à corriger** ; ne pas la marquer « validée en production » ;
3. créer ou mettre à jour un ticket lié à l'identifiant de suivi existant, sans créer un doublon ;
4. examiner le SHA réellement déployé, les journaux non sensibles, les autorisations, les données, la route/API et les dépendances ;
5. corriger sur une branche dédiée, ajouter un test de non-régression qui reproduit l'échec, exécuter les contrôles requis et ouvrir une PR ;
6. fusionner lorsque les contrôles techniques et les garde-fous sont satisfaits, puis confirmer le déploiement du SHA exact ;
7. remettre à l'utilisateur uniquement le nouveau test nécessaire et conserver le même identifiant de suivi jusqu'à validation réelle.

Le retour utilisateur est une preuve de défaut à investiguer, non une clôture. La correction n'est terminée qu'après un nouveau test concluant. Si l'information fournie ne permet pas de reproduire le défaut, demander seulement le détail minimal manquant (étapes, message d'erreur non sensible ou capture expurgée), sans lui demander de refaire les vérifications déjà réalisées.
