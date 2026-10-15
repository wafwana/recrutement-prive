# Registre des correctifs validés — Recrutement Privé

> **Checkpoint commun obligatoire pour tous les agents, automatisations et conversations.** Consulter ce fichier avant de déclarer un incident actif, de modifier du code ou de relancer un correctif.
>
> Dernière vérification de référence : **15 octobre 2026**. Ce registre est un état traçable, pas une affirmation permanente : revérifier les SHA GitHub et Vercel au début d'une nouvelle intervention.

## Référence de production vérifiée

- Dépôt : [wafwana/recrutement-prive](https://github.com/wafwana/recrutement-prive)
- Branche de référence : `main`
- SHA de `main` relevé lors de la vérification : `bd46adf3388aa6a6abb3165d42fb4dbc2fdca545`
- Déploiement Vercel associé : `dpl_8uekL7tWxL42To6zVVX56ostvpS2`
- État relevé : `READY`
- SHA déployé relevé : `bd46adf3388aa6a6abb3165d42fb4dbc2fdca545`
- Domaine : [www.recrutement-prive.com](https://www.recrutement-prive.com/)

**Précaution :** le SHA et le statut de déploiement ci-dessus sont ceux constatés à la date de vérification. Au prochain travail, relever à nouveau la tête de `main`, le déploiement de production et leurs SHA avant d'utiliser ces valeurs comme état courant.

## Correctifs résolus — ne pas les recommencer sans nouvelle preuve

| Sujet | Statut confirmé | Preuves / référence | Règle pour la suite |
|---|---|---|---|
| Reprise bornée des erreurs réseau Gemini | **Fusionné dans main et inclus dans le déploiement de production de référence**. Les tests dédiés existent et la CI/porte OWNER étaient vertes pour la livraison. | [PR #264 fusionnée](https://github.com/wafwana/recrutement-prive/pull/264), commit de fusion `ba350f91fdcc8397baea84dd419c26b07b80a358`; code `lib/ai/gemini.ts` (blob relevé `aada9a835214980f3efde92179f1b7d9168fa746`); tests `tests/gemini-retry.test.ts` (blob relevé `f59bb01f396247e2c83297aaed84b6efabf4ef03`). | Le code ne fait qu'une nouvelle tentative bornée pour les erreurs réseau transitoires, HTTP 429 et 500/502/503/504 ; il ne réessaie pas les erreurs permanentes 400/401/403/404. **Ne pas rouvrir ce chantier sur la seule base de l'ancienne PR #263.** Si un échec est reproduit à nouveau, relever l'heure, le SHA déployé, le statut HTTP non sensible et le scénario, puis ajouter un test ciblé avant de modifier le code. |
| Ancienne PR Gemini #263 | **Fermée car supersédée**, non fusionnée. | [PR #263 fermée](https://github.com/wafwana/recrutement-prive/pull/263) ; elle est remplacée par [PR #264](https://github.com/wafwana/recrutement-prive/pull/264), déjà fusionnée. | Ne pas utiliser son ancien état comme preuve d'un blocage actif. |
| Visibilité du médaillon RP Global Partners | **Fusionné et déployé** dans l'état de production de référence. | [PR #267 fusionnée](https://github.com/wafwana/recrutement-prive/pull/267), commit de fusion `bd46adf3388aa6a6abb3165d42fb4dbc2fdca545`; déploiement Vercel ci-dessus. | Le CSS place le médaillon en haut à droite, à l'intérieur du hero, conserve une taille responsive importante sur ordinateur et le maintient visible aux tailles tablette/mobile. Ne pas restaurer l'ancien `top: -88px`, ne pas le masquer sur mobile et ne pas réduire sa taille sans besoin prouvé. |

## Travaux encore non confirmés — ne pas les présenter comme résolus

| Sujet | État au 15 octobre 2026 | Prochaine action correcte |
|---|---|---|
| Skyline haute résolution | **Non livrée en production** selon les éléments vérifiés : la ressource déployée était rapportée à 680 × 462 px et manquait de netteté lorsqu'elle était agrandie. | Rechercher les branches et PR déjà existantes, retrouver la meilleure ressource source, puis intégrer uniquement l'amélioration manquante via une PR dédiée. Ne pas remplacer le visuel de référence par une image générique, ne pas repartir du hero entier. |
| Executive Search & Secure Interview Center | **Partiellement opérationnel dans la référence initiale** : l’écran Owner affichait des compteurs, du contenu descriptif et une file d’autorisation, mais pas de vues dédiées aux présentations, aux entretiens, aux décisions et à la prospection. La correction d’interface est en cours dans la [PR #270](https://github.com/wafwana/recrutement-prive/pull/270) ; CI, porte OWNER, fusion, déploiement et parcours réel restent à confirmer. | [PR #189 fusionnée — livraison du socle](https://github.com/wafwana/recrutement-prive/pull/189) ; `app/espace/owner/contacts-securises/page.tsx`, `AuthorizationQueue.tsx`, modèle `MissionPresentation` et endpoint `/api/contacts/secure`. | Réutiliser les données et actions existantes ; préserver les alias et le contrôle OWNER ; ne pas simuler un paiement ou une décision de l’entreprise. Ne considérer la lacune d’interface comme résolue qu’après CI/OWNER gates, déploiement du SHA attendu et vérification des onglets sur le domaine de production. |
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
