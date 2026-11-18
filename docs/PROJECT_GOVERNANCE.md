# Recrutement Privé — Règles permanentes de gouvernance et de non-régression

## 1. Principe fondamental

Toute fonctionnalité, configuration, accès, droit, donnée, règle métier ou comportement explicitement validé doit être préservé lors de toute nouvelle modification du projet.

Toute nouvelle version, correction, amélioration ou fonctionnalité doit améliorer l'existant sans supprimer, désactiver ou modifier involontairement ce qui a déjà été validé.

Cette règle s'applique :
- pendant toute la construction de la plateforme ;
- lors de la mise en production ;
- après la mise en ligne ;
- à toutes les mises à jour, corrections et améliorations futures.

## 2. Non-régression

Avant toute modification, le travail existant doit être inspecté afin d'identifier les fonctionnalités et configurations déjà présentes et validées.

Après toute modification, les fonctionnalités existantes concernées doivent être vérifiées.

Une modification qui crée une régression ne doit pas être considérée comme terminée ou validée.

La dernière version stable et validée reste la référence tant que la nouvelle version n'a pas été entièrement vérifiée.

## 3. Conservation des accès

Une mise à jour ou une amélioration ne doit jamais supprimer, restreindre ou modifier involontairement un accès existant.

Cela concerne notamment :
- l'accès OWNER ;
- les accès ADMIN ;
- l'espace Candidat ;
- l'espace Entreprise ;
- l'espace Consultant ;
- les fonctionnalités publiques prévues ;
- les accès aux données autorisées.

Toute modification volontaire des droits ou de la gouvernance doit être explicitement identifiée, justifiée, contrôlée et validée avant son intégration.

## 4. Gouvernance OWNER / ADMIN

L'OWNER est l'autorité suprême de la plateforme et possède tous les droits ADMIN.

Seul l'OWNER peut :
- créer un ADMIN ;
- désigner un ADMIN ;
- remplacer un ADMIN ;
- suspendre un ADMIN ;
- révoquer un ADMIN.

Un ADMIN ne peut jamais :
- modifier son propre rôle ;
- créer ou désigner un OWNER ;
- modifier l'OWNER ;
- révoquer l'OWNER.

Les actions sensibles doivent être journalisées et, selon leur nature, notifiées à l'OWNER, soumises à son approbation ou conçues pour être réversibles.

Le changement d'OWNER est exceptionnel et doit faire l'objet d'une procédure renforcée de vérification, de traçabilité et de validation.

## 5. Historique avant conclusion

Lorsqu'une fonctionnalité, configuration ou opération est signalée comme ayant déjà été réalisée, configurée ou testée auparavant, il ne faut jamais conclure qu'elle n'a jamais existé uniquement parce qu'elle n'est plus visible dans l'état actuel du projet.

Avant toute conclusion, vérifier autant que possible :
- les commits GitHub ;
- les branches ;
- les Pull Requests ;
- les fichiers historiques ;
- les configurations ;
- les variables d'environnement ;
- les déploiements ;
- les configurations des services externes ;
- les autres traces disponibles.

L'état actuel ne constitue pas à lui seul une preuve de l'historique.

En cas d'incertitude, indiquer clairement ce qui est vérifié, ce qui est probable et ce qui reste à confirmer.

## 6. Travail des agents et outils externes

Tout agent de développement, notamment Jules, doit respecter ces règles.

Un agent ne doit pas :
- supprimer une fonctionnalité validée sans justification ;
- modifier un accès validé sans autorisation ;
- remplacer une configuration existante sans vérifier ses conséquences ;
- réimplémenter inutilement un travail déjà réalisé ;
- modifier directement la branche principale sans procédure de validation.

Les modifications importantes doivent être réalisées de manière contrôlée et vérifiable, notamment au moyen d'une branche et d'une Pull Request lorsque cela est approprié.

## 7. Validation avant intégration

Une modification ne doit être considérée comme terminée que lorsque :
1. son objectif est atteint ;
2. les tests nécessaires sont passés ;
3. la CI est vérifiée lorsque disponible ;
4. les fonctionnalités existantes concernées sont toujours fonctionnelles ;
5. les accès et règles de gouvernance sont préservés ;
6. aucune régression connue n'est laissée sans signalement.

## 8. Règle de transparence sur l'avancement

Toute communication sur l'avancement doit distinguer clairement :

- **VALIDÉ** : vérifié et fonctionnel ;
- **EN COURS** : travail commencé mais pas encore validé ;
- **À VÉRIFIER** : modification effectuée mais validation incomplète ;
- **BLOQUÉ** : progression empêchée par un problème identifié ;
- **RÉGRESSION** : une fonctionnalité précédemment fonctionnelle ou validée ne fonctionne plus.

La création d'un commit, d'une branche ou d'une Pull Request ne constitue pas à elle seule une preuve que la fonctionnalité est terminée ou fonctionnelle.

## 9. Objectif permanent

L'objectif de chaque évolution est :

> AMÉLIORER LA PLATEFORME SANS PERDRE CE QUI A DÉJÀ ÉTÉ CONSTRUIT ET VALIDÉ.

Toute nouvelle fonctionnalité doit s'intégrer à l'existant de manière cohérente, sécurisée, réversible lorsque nécessaire et sans régression.


## 10. Règle commune de sécurité et de permissions — toutes les plateformes

Cette règle s'applique à l'ensemble des plateformes et projets de l'OWNER, notamment Recrutement Privé, Studio Event 59, Diagnostique Téléradiologie Afrique, leurs pôles, modules et évolutions futures. Elle doit être reprise dans le dossier de règles de chaque dépôt indépendant.

### 10.1 Socle de sécurité commun

- Réutiliser en priorité les mécanismes de sécurité déjà en place et validés dans chaque plateforme.
- Centraliser et maintenir cohérents l'authentification, les rôles, les permissions, l'isolation des données et la journalisation.
- Une nouvelle fonctionnalité doit s'intégrer au socle existant ; elle ne doit pas créer un système parallèle ni des règles contradictoires.
- Ne pas ajouter de contrôles redondants lorsqu'une protection existante couvre déjà le besoin.
- Vérifier les risques propres à chaque évolution et appliquer des contrôles proportionnés.
- La simplification des contrôles ne doit jamais affaiblir les permissions, la confidentialité ou la protection des données.

### 10.2 Permissions indispensables

- Les permissions sont une protection fondamentale et obligatoire de chaque plateforme.
- Chaque rôle ne peut accéder qu'aux fonctionnalités, actions et données explicitement autorisées.
- Les permissions sont vérifiées côté serveur ; masquer un bouton ou une page dans l'interface ne suffit pas.
- Aucun utilisateur ne peut s'attribuer ou augmenter lui-même ses permissions.
- Les nouveaux modules réutilisent le système de permissions de leur plateforme et déclarent uniquement les permissions nouvelles réellement nécessaires.
- Les permissions doivent rester cohérentes entre les interfaces, les API et les opérations sur les données.

### 10.3 Gouvernance OWNER / ADMIN

- L'OWNER est l'autorité suprême de chaque plateforme et conserve tous les droits ADMIN.
- Seul l'OWNER peut créer, désigner, remplacer, suspendre ou révoquer un ADMIN.
- Un ADMIN ne peut pas modifier son propre rôle, créer ou désigner un OWNER, ni modifier ou révoquer l'OWNER.
- Les règles de gouvernance OWNER / ADMIN existantes restent applicables ; cette règle commune ne les remplace pas et ne les affaiblit pas.
- Les actions sensibles sont journalisées et, selon leur nature, notifiées, soumises à approbation ou rendues réversibles.

### 10.4 Principe d'évolution

Toute évolution doit préserver le socle de sécurité et les permissions existantes, sans multiplier les barrières spécifiques à chaque fonctionnalité. En cas de besoin nouveau, étendre de façon cohérente le système commun plutôt que créer une sécurité isolée.

**Principe directeur : permissions solides et centralisées, sécurité réutilisée, contrôles proportionnés, aucune régression.**
