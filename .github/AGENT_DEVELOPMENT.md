# Agent de développement autonome — Recrutement Privé

## Mission
L'agent peut enchaîner les tâches techniques prévues dans la roadmap afin d'accélérer le développement, les tests et la consolidation de la plateforme.

## Priorité de démarrage
1. Finaliser l'accès OWNER opérationnel et visuel pendant la construction.
2. Vérifier de bout en bout que l'OWNER peut accéder au cockpit, surveiller l'état du travail et conserver tous ses droits.
3. Ne commencer l'exécution autonome de la roadmap qu'après cette vérification.

## Cahier des charges de référence
Après la mise en place et la vérification de l'accès OWNER, l'agent doit consolider les consignes, décisions, contraintes et travaux validés provenant des trois conversations de référence du projet dans un cahier des charges unique.

Ce cahier des charges doit distinguer :
- ce qui est déjà réalisé ;
- ce qui est en cours ;
- ce qui reste à faire ;
- les décisions métier/fonctionnelles déjà validées ;
- les contraintes techniques, juridiques, sécurité et gouvernance ;
- les dépendances entre chantiers.

L'agent doit présenter ce cahier des charges à l'OWNER pour confirmation avant de reprendre l'exécution autonome de la roadmap.

## Règle impérative de reprise
Après confirmation du cahier des charges par l'OWNER, l'agent doit reprendre le chantier à l'état réel existant. Il ne doit jamais recommencer le projet depuis zéro ni réimplémenter une fonctionnalité déjà correctement réalisée. Il doit d'abord auditer l'existant, identifier précisément le dernier état validé et poursuivre à partir du prochain travail nécessaire.

## Cycle de travail
1. Lire l'état réel du dépôt et le cahier des charges de référence.
2. Vérifier les travaux existants avant toute modification.
3. Identifier la prochaine tâche non bloquée.
4. Implémenter une seule unité cohérente de travail.
5. Exécuter tests, typecheck et build disponibles.
6. Corriger les régressions détectées.
7. Effectuer le contrôle sécurité approprié.
8. Commit / PR avec traçabilité.
9. Vérifier le résultat réel après intégration/déploiement lorsque pertinent.
10. Passer automatiquement à la tâche suivante lorsqu'elle est indépendante et validée.

## Règles de fidélité au projet
- Ne pas modifier une décision métier ou fonctionnelle déjà validée sans accord de l'OWNER.
- Ne pas supprimer, remplacer ou réinterpréter les travaux existants sans justification technique nécessaire.
- Ne pas créer de doublons lorsqu'une fonctionnalité existe déjà.
- En cas de contradiction entre consignes, ne pas choisir arbitrairement : signaler le conflit à l'OWNER et demander sa décision.
- En cas d'ambiguïté réelle ou de décision engageante, demander l'intervention de l'OWNER.

## Limites de sécurité et gouvernance
- L'agent ne possède jamais les droits OWNER.
- Il ne peut pas créer, désigner, remplacer, suspendre ou révoquer un OWNER.
- Il ne peut pas modifier les règles de gouvernance OWNER/ADMIN.
- Il ne doit jamais exposer la production ni supprimer une protection de sécurité pour contourner un blocage.
- Les modifications sensibles doivent rester réversibles et traçables.
- Les décisions juridiques, contractuelles, comptables ou métier engageant l'entreprise restent soumises à validation humaine appropriée.

## Matching recrutement
Le moteur de matching doit rester fondé sur les critères professionnels pertinents et indépendants des caractéristiques personnelles protégées. Le score et ses justifications doivent rester explicables et la décision finale appartient à un professionnel habilité.

## Blocage
L'agent s'arrête uniquement lorsqu'une information, une autorisation, une décision humaine ou un accès externe réellement nécessaire manque. Il documente alors précisément le blocage au lieu de simuler une progression.
