# Registre des correctifs validés — Recrutement Privé

> **Checkpoint commun obligatoire pour tous les agents, automatisations et conversations.** Consulter ce fichier avant de déclarer un incident actif, de modifier du code ou de relancer un correctif.
>
> Dernière vérification de référence : **16 octobre 2026**. Ce registre est un état traçable, pas une affirmation permanente : revérifier les SHA GitHub et Vercel au début d'une nouvelle intervention.

## Référence de production vérifiée

- Dépôt : [wafwana/recrutement-prive](https://github.com/wafwana/recrutement-prive)
- Branche de référence : `main`
- SHA de `main` relevé le 16 octobre 2026 : `a852516182b4d9cf5534442c05219cfd4d2d3c09`
- Déploiement Vercel de production associé : `dpl_BctMMAeLH2cFs5QXnVgFZpmxk3oA`
- État relevé : `READY` (cible `production`, sans erreur d’alias)
- SHA déployé : `a852516182b4d9cf5534442c05219cfd4d2d3c09`
- Domaine : [www.recrutement-prive.com](https://www.recrutement-prive.com/)

**Précaution :** le SHA et le statut de déploiement ci-dessus sont ceux constatés à la date de vérification. Au prochain travail, relever à nouveau la tête de `main`, le déploiement de production et leurs SHA avant d'utiliser ces valeurs comme état courant.

## Correctifs résolus — ne pas les recommencer sans nouvelle preuve

| Sujet | Statut confirmé | Preuves / référence | Règle pour la suite |
|---|---|---|---|
| Reprise bornée des erreurs réseau Gemini | **Fusionné dans main et inclus dans le déploiement de production de référence**. Les tests dédiés existent et la CI/porte OWNER étaient vertes pour la livraison. | [PR #264 fusionnée](https://github.com/wafwana/recrutement-prive/pull/264), commit de fusion `ba350f91fdcc8397baea84dd419c26b07b80a358`; code `lib/ai/gemini.ts` (blob relevé `aada9a835214980f3efde92179f1b7d9168fa746`); tests `tests/gemini-retry.test.ts` (blob relevé `f59bb01f396247e2c83297aaed84b6efabf4ef03`). | Le code ne fait qu'une nouvelle tentative bornée pour les erreurs réseau transitoires, HTTP 429 et 500/502/503/504 ; il ne réessaie pas les erreurs permanentes 400/401/403/404. **Ne pas rouvrir ce chantier sur la seule base de l'ancienne PR #263.** Si un échec est reproduit à nouveau, relever l'heure, le SHA déployé, le statut HTTP non sensible et le scénario, puis ajouter un test ciblé avant de modifier le code. |
| Ancienne PR Gemini #263 | **Fermée car supersédée**, non fusionnée. | [PR #263 fermée](https://github.com/wafwana/recrutement-prive/pull/263) ; elle est remplacée par [PR #264](https://github.com/wafwana/recrutement-prive/pull/264), déjà fusionnée. | Ne pas utiliser son ancien état comme preuve d'un blocage actif. |
| Visibilité du médaillon RP Global Partners | **Fusionné et déployé** dans l'état de production de référence. | [PR #267 fusionnée](https://github.com/wafwana/recrutement-prive/pull/267), commit de fusion `bd46adf3388aa6a6abb3165d42fb4dbc2fdca545`; déploiement Vercel ci-dessus. | Le CSS place le médaillon en haut à droite, à l'intérieur du hero, conserve une taille responsive importante sur ordinateur et le maintient visible aux tailles tablette/mobile. Ne pas restaurer l'ancien `top: -88px`, ne pas le masquer sur mobile et ne pas réduire sa taille sans besoin prouvé. |
| Cockpit OWNER — guide métier et listes entreprises/offres | **Fusionné et déployé le 16 octobre 2026.** La page OWNER affiche maintenant le parcours CV → bibliothèque → métiers/dossiers → sourcing → matching → entreprises, ainsi que des listes d’aperçu issues des données déjà chargées. Deux compteurs ont été reliés à leurs sections opérationnelles plutôt qu’à des routes de liste inexistantes. Aucun changement de rôle, permission, donnée ou schéma. | [PR #274 fusionnée](https://github.com/wafwana/recrutement-prive/pull/274), commit `a852516182b4d9cf5534442c05219cfd4d2d3c09`; CI #1267, OWNER Compatibility Gate #592 et les deux contrôles Vercel réussis; déploiement `dpl_BctMMAeLH2cFs5QXnVgFZpmxk3oA` `READY`. L’ancienne PR #268 a été fermée comme remplacée. | Réutiliser les routes existantes. Le guide améliore la navigation mais ne remplace pas les tests en session réelle OWNER/candidat/entreprise. |

## Travaux encore non confirmés — ne pas les présenter comme résolus

| Sujet | État au 15 octobre 2026 | Prochaine action correcte |
|---|---|---|
| Skyline haute résolution | **Non livrée en production** selon les éléments vérifiés : la ressource déployée était rapportée à 680 × 462 px et manquait de netteté lorsqu'elle était agrandie. | Rechercher les branches et PR déjà existantes, retrouver la meilleure ressource source, puis intégrer uniquement l'amélioration manquante via une PR dédiée. Ne pas remplacer le visuel de référence par une image générique, ne pas repartir du hero entier. |
| Executive Search & Secure Interview Center | **Corrigé dans le code, fusionné et déployé en production**. Les six onglets et leurs données sont présents dans le SHA `850014fc0730a03a2b0cc5739ae628ada5dfa7f2`. Les contrôles CI et OWNER ont réussi sur le SHA de la PR ; Vercel indique `READY` sur le commit de fusion et l’alias `www.recrutement-prive.com` pointe vers ce déploiement. **Le test manuel avec une session OWNER authentifiée reste non vérifié** dans cette intervention. | [PR #270 fusionnée](https://github.com/wafwana/recrutement-prive/pull/270), commit `850014fc0730a03a2b0cc5739ae628ada5dfa7f2`, déploiement `dpl_3QSVkjJdkMA6CWN6jS3gH9x4ZJfL`; `app/espace/owner/contacts-securises/page.tsx`, `ExecutiveSearchTabs.tsx`, `AuthorizationQueue.tsx`. | Ne plus traiter « aucun onglet exploitable » comme un blocage actif : la fonctionnalité a été livrée. Ne la rouvrir qu’en présence d’un échec reproduit sur le SHA déployé. Pour clore également la vérification fonctionnelle, ouvrir la page en session OWNER et contrôler les onglets, filtres et autorisation/refus ; ne pas confondre cela avec les tests CI ou le statut READY. |
| Matching direct candidat–offre et préparation de présentation confidentielle | **Fusionné et présent dans la production actuelle**. Fonctionnalité livrée par la PR #272, commit `fca6b07815272e854963a41a7801fc646b6a3d70`; le déploiement courant inclut aussi ce commit ainsi que les finitions du cockpit OWNER. **Le test manuel avec session OWNER authentifiée reste non vérifié.** | [PR #272 fusionnée](https://github.com/wafwana/recrutement-prive/pull/272), commit `fca6b07815272e854963a41a7801fc646b6a3d70`; [déploiement de production courant](https://vercel.com/emerywafwana-6362s-projects/recruitment-prive/BctMMAeLH2cFs5QXnVgFZpmxk3oA), SHA `a852516182b4d9cf5534442c05219cfd4d2d3c09`, `READY`. Tests `tests/cv-matching-dashboard.test.ts`; API `app/api/owner/cv-matching/route.ts`; interface `app/espace/owner/cv-matching/page.tsx`. | Les propositions sont présentées dans les deux directions, sans noms/e-mails directs dans les suggestions. L’Owner (ou un Admin doté explicitement de `PRESENTATIONS_MANAGE`) décide d’ouvrir une présentation confidentielle ; score et doublon sont revérifiés côté serveur, la décision est auditée et aucun e-mail/contact externe n’est envoyé automatiquement. Pour clore la vérification fonctionnelle, ouvrir `/espace/owner/cv-matching` avec une vraie session OWNER et vérifier affichage, filtres, action de présentation, doublons et anonymat. |
| Smoke tests candidat et entreprise de bout en bout | **Non vérifiés dans cette référence.** Les tests automatisés verts ne prouvent pas à eux seuls tous les parcours en conditions réelles. | Exécuter un scénario candidat authentifié (dépôt/analyse CV) et un scénario entreprise authentifié, avec les autorisations appropriées ; consigner le résultat réel et le SHA testé. Ne pas inventer de résultat si les identités ou accès ne sont pas disponibles. |

## Protocole obligatoire avant toute intervention

1. Lire ce registre et le [cahier des charges maître](../CAHIER_DES_CHARGES.md).
2. Lire le SHA de `main`, rechercher les PR ouvertes/fermées/fusionnées, les branches, les commits et les tests liés au sujet.
3. Pour chaque ancien problème signalé, vérifier s'il existe un correctif équivalent fusionné sous une autre PR ; vérifier le code/test courant et comparer les commits avec `main`.
4. Relever le SHA du déploiement public Vercel. Ne pas assimiler automatiquement un commit mergé, une preview `READY` et un test du domaine de production.
5. Si le correctif est valide et présent dans le SHA déployé, **ne pas le refaire**. Documenter le point comme résolu et avancer au prochain écart réellement prouvé.
6. Si une régression est démontrée, isoler le scénario qui échoue sur le SHA actuellement déployé et corriger cette cause racine seulement.
7. Mettre à jour ce registre dans la PR de travail lorsqu'un statut change. Toute modification doit suivre le processus normal de revue, de CI, de contrôle OWNER, de fusion et de vérification du déploiement.

## Règle de communication

Toujours distinguer :
- **Résolu dans le code** : la correction est dans les fichiers de référence.
- **Testé** : les contrôles ont réussi sur un SHA indiqué.
- **Déployé** : le SHA attendu est `READY` et sert le domaine voulu.
- **Vérifié en production** : le scénario réel a été exécuté et son résultat observé.

Une conversation ne doit jamais relancer un problème uniquement parce qu'une ancienne PR reste ouverte. Elle doit d'abord prouver que le défaut subsiste dans le code et le déploiement actuels.
