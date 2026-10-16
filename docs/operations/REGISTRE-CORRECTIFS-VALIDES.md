# Registre des correctifs validés — Recrutement Privé

> **Checkpoint commun obligatoire pour tous les agents, automatisations et conversations.** Consulter ce fichier avant de déclarer un incident actif, de modifier du code ou de relancer un correctif.
>
> Dernière vérification de référence : **16 octobre 2026**. Ce registre est un état traçable, pas une affirmation permanente : revérifier les SHA GitHub et Vercel au début d'une nouvelle intervention.

## Référence de production vérifiée

- Dépôt : [wafwana/recrutement-prive](https://github.com/wafwana/recrutement-prive)
- Branche de référence : `main`
- SHA de `main` relevé le 16 octobre 2026 : `9a474fec2074f64e7c4850588d614af43780e11d`
- Déploiement Vercel de production associé : `dpl_CwjMsrPihgrnGZTngabuXqW2UVv3`
- État relevé : `READY` (cible `production`, sans erreur d’alias)
- SHA déployé : `9a474fec2074f64e7c4850588d614af43780e11d`
- Domaine : [www.recrutement-prive.com](https://www.recrutement-prive.com/)

**Précaution :** le SHA et le statut ci-dessus constituent un instantané vérifié le 16 octobre 2026. Une fusion ultérieure de documentation seule peut faire avancer `main` sans changer le code applicatif déployé. Au prochain travail, relever à nouveau `main`, le déploiement de production, leurs SHA et l’état des domaines avant de traiter ces valeurs comme courantes.

## Correctifs résolus — ne pas les recommencer sans nouvelle preuve

| Sujet | Statut confirmé | Preuves / référence | Règle pour la suite |
|---|---|---|---|
| Reprise bornée des erreurs réseau Gemini | **Fusionné dans main et inclus dans le déploiement de production de référence**. Les tests dédiés existent et la CI/porte OWNER étaient vertes pour la livraison. | [PR #264 fusionnée](https://github.com/wafwana/recrutement-prive/pull/264), commit de fusion `ba350f91fdcc8397baea84dd419c26b07b80a358`; code `lib/ai/gemini.ts` (blob relevé `aada9a835214980f3efde92179f1b7d9168fa746`); tests `tests/gemini-retry.test.ts` (blob relevé `f59bb01f396247e2c83297aaed84b6efabf4ef03`). | Le code ne fait qu'une nouvelle tentative bornée pour les erreurs réseau transitoires, HTTP 429 et 500/502/503/504 ; il ne réessaie pas les erreurs permanentes 400/401/403/404. **Ne pas rouvrir ce chantier sur la seule base de l'ancienne PR #263.** Si un échec est reproduit à nouveau, relever l'heure, le SHA déployé, le statut HTTP non sensible et le scénario, puis ajouter un test ciblé avant de modifier le code. |
| Ancienne PR Gemini #263 | **Fermée car supersédée**, non fusionnée. | [PR #263 fermée](https://github.com/wafwana/recrutement-prive/pull/263) ; elle est remplacée par [PR #264](https://github.com/wafwana/recrutement-prive/pull/264), déjà fusionnée. | Ne pas utiliser son ancien état comme preuve d'un blocage actif. |
| Visibilité du médaillon RP Global Partners | **Fusionné et déployé** dans l'état de production de référence. | [PR #267 fusionnée](https://github.com/wafwana/recrutement-prive/pull/267), commit de fusion `bd46adf3388aa6a6abb3165d42fb4dbc2fdca545`; déploiement Vercel ci-dessus. | Le CSS place le médaillon en haut à droite, à l'intérieur du hero, conserve une taille responsive importante sur ordinateur et le maintient visible aux tailles tablette/mobile. Ne pas restaurer l'ancien `top: -88px`, ne pas le masquer sur mobile et ne pas réduire sa taille sans besoin prouvé. |
| Netteté de la skyline du Hero sur ordinateur | **Correction CSS fusionnée et déployée le 16 octobre 2026.** Les grands écrans utilisent maintenant la composition d’origine `rp-global-partners.jpeg` (environ 1366 × 768 px), découpée côté droit pour afficher la skyline approuvée sans l’étirer fortement ; le médaillon transparent reste séparé et le rendu tablette/mobile est conservé. La vérification visuelle manuelle sur plusieurs largeurs n’a pas été effectuée. | [PR #276 fusionnée](https://github.com/wafwana/recrutement-prive/pull/276), commit `9a474fec2074f64e7c4850588d614af43780e11d`; CI #1270, OWNER Compatibility Gate #595 et contrôles Vercel réussis ; déploiement `dpl_CwjMsrPihgrnGZTngabuXqW2UVv3` `READY`. | Ne pas remplacer la composition validée par une skyline générique. Vérifier visuellement le rendu desktop aux largeurs 1181, 1440 et 1920 px avant de clore le contrôle visuel. |
| Cockpit OWNER — guide métier et listes entreprises/offres | **Fusionné et inclus dans la production actuelle.** La page OWNER affiche le parcours CV → bibliothèque → métiers/dossiers → sourcing → matching → entreprises et les listes d’aperçu à partir des données déjà chargées. Deux compteurs pointent vers les sections opérationnelles plutôt que vers des routes de liste inexistantes. Aucun changement de rôle, permission, donnée ou schéma. | [PR #274 fusionnée](https://github.com/wafwana/recrutement-prive/pull/274), commit `a852516182b4d9cf5534442c05219cfd4d2d3c09`; CI #1267 et OWNER Compatibility Gate #592 réussis. La livraison est incluse dans le SHA de production `9a474fec2074f64e7c4850588d614af43780e11d`, déploiement `dpl_CwjMsrPihgrnGZTngabuXqW2UVv3` `READY`. L’ancienne PR #268 a été fermée comme remplacée. | Réutiliser les routes existantes. Le guide ne remplace pas les tests en session réelle OWNER/candidat/entreprise. |

## Travaux encore non confirmés — ne pas les présenter comme résolus

| Sujet | État vérifié au 16 octobre 2026 | Prochaine action correcte |
|---|---|---|
| Vérification visuelle du Hero et photos premium des secteurs/métiers | **Correction technique de netteté desktop livrée par la PR #276.** Reste à confirmer le rendu réel du Hero sur grand écran et à traiter les photographies premium des secteurs/métiers demandées dans l’issue #49. Les anciens fichiers `ai-human.jpeg`, `cabinet-office.jpeg`, `enterprise-handshake.jpeg` et `hero-portrait.jpeg` sont des fichiers image invalides/tronqués ; `maquette-reference.png` contient du texte de référence, pas une vraie image PNG. Aucun de ces fichiers ne doit être utilisé comme image active. | Vérifier visuellement le site sur ordinateur/tablette/mobile ; préparer de vrais assets autorisés et adaptés aux familles métiers via une PR dédiée, sans image générique de remplacement. Corriger aussi le README des visuels pour qu’il reflète les assets réellement utilisés. Ne pas reconstruire le Hero ni modifier les parcours. |
| Executive Search & Secure Interview Center | **Corrigé dans le code et inclus dans la production actuelle**. Les six onglets sont présents depuis la PR #270 et la page est incluse dans le SHA de production `9a474fec2074f64e7c4850588d614af43780e11d` (`READY`, déploiement `dpl_CwjMsrPihgrnGZTngabuXqW2UVv3`). **Le test manuel avec une session OWNER authentifiée reste non vérifié.** | [PR #270 fusionnée](https://github.com/wafwana/recrutement-prive/pull/270), commit fonctionnel `850014fc0730a03a2b0cc5739ae628ada5dfa7f2`; `app/espace/owner/contacts-securises/page.tsx`, `ExecutiveSearchTabs.tsx`, `AuthorizationQueue.tsx`. | Ne plus traiter « aucun onglet exploitable » comme un blocage actif : la fonctionnalité a été livrée. Ne la rouvrir qu’en présence d’un échec reproduit sur le SHA déployé. Pour clore la vérification fonctionnelle, ouvrir la page en session OWNER et contrôler les onglets, filtres et autorisation/refus. |
| Matching direct candidat–offre et préparation de présentation confidentielle | **Fusionné et présent dans la production actuelle**. Livré par la PR #272, commit `fca6b07815272e854963a41a7801fc646b6a3d70`; présent dans le SHA de production `9a474fec2074f64e7c4850588d614af43780e11d`, déploiement `dpl_CwjMsrPihgrnGZTngabuXqW2UVv3` `READY`. **Le test manuel avec session OWNER authentifiée reste non vérifié.** | [PR #272 fusionnée](https://github.com/wafwana/recrutement-prive/pull/272), commit `fca6b07815272e854963a41a7801fc646b6a3d70`; tests `tests/cv-matching-dashboard.test.ts`; API `app/api/owner/cv-matching/route.ts`; interface `app/espace/owner/cv-matching/page.tsx`. | Les propositions sont présentées dans les deux directions, sans noms/e-mails directs. L’Owner (ou un Admin doté explicitement de `PRESENTATIONS_MANAGE`) décide d’ouvrir une présentation confidentielle ; score et doublon sont revérifiés côté serveur, la décision est auditée et aucun contact externe n’est envoyé automatiquement. Une session OWNER réelle reste nécessaire pour vérifier affichage, filtres, présentations, doublons et anonymat. |
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
