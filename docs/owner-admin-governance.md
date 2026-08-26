# Gouvernance OWNER / ADMIN

## Autorité

- OWNER = autorité suprême de la plateforme et dispose de tous les droits ADMIN.
- Au démarrage, l'OWNER peut également exercer le rôle ADMIN sans validation croisée.
- ADMIN = rôle distinct, délégué par l'OWNER.

## Création et gestion des ADMIN

- Seul l'OWNER peut créer, désigner, remplacer, suspendre ou révoquer un ADMIN.
- Un ADMIN ne peut jamais modifier son propre rôle.
- Un ADMIN ne peut jamais créer ou désigner un OWNER.
- Un ADMIN ne peut jamais modifier ou révoquer l'OWNER.
- L'OWNER conserve ses droits propres lorsqu'un autre ADMIN est désigné.

## Actions sensibles

Les actions sensibles doivent être contrôlées côté serveur, journalisées et, selon leur nature, notifiées à l'OWNER, soumises à son approbation ou rendues réversibles.

## Changement d'OWNER

Le changement d'OWNER est exceptionnel. Il nécessite une procédure renforcée de vérification, de traçabilité et de validation.

## Contrôle d'accès

L'interface ne constitue jamais la seule protection. Toute route sensible doit vérifier le rôle côté serveur. Une présence sur une URL, un appel API direct ou une modification côté client ne doit pas permettre de contourner la gouvernance.

## Règle de production

Le déploiement de production ne doit pas désactiver l'authentification des espaces privés. Le mode maintenance peut suspendre temporairement l'accès fonctionnel selon sa configuration, mais ne doit pas créer de bypass d'authentification pour les espaces privés lorsque la plateforme est opérationnelle.
