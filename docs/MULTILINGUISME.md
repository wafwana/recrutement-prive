# Recrutement Privé — Multilinguisme

## Décision fonctionnelle validée

Recrutement Privé doit permettre la traduction de la plateforme en plusieurs langues.

Le multilinguisme doit être conçu comme une capacité native de la plateforme, et non comme une traduction ponctuelle. L’architecture doit permettre d’ajouter de nouvelles langues sans reconstruire l’application.

## Périmètre

Le système multilingue doit couvrir les espaces et parcours de la plateforme :

- site public ;
- espace candidat ;
- espace entreprise ;
- espace consultant ;
- espace administration ;
- espace Owner ;
- messages, libellés, boutons, formulaires, notifications et textes système ;
- emails et communications générées par la plateforme lorsque leur contenu est contrôlé par l’application.

## Règles fonctionnelles

1. Un sélecteur de langue doit permettre à l’utilisateur de choisir sa langue lorsqu’il est pertinent.
2. La langue choisie doit être conservée pour les visites et sessions ultérieures selon une méthode appropriée.
3. Une langue par défaut doit être définie pour les utilisateurs n’ayant pas encore choisi de langue.
4. L’ajout d’une nouvelle langue doit être réalisable sans réécrire les composants métier.
5. Les textes d’interface ne doivent pas être codés en dur dans les composants lorsqu’ils doivent être traduits.
6. Les données saisies par les utilisateurs (CV, messages, intitulés propres, descriptions libres, etc.) ne doivent pas être modifiées ou traduites automatiquement sans fonctionnalité explicitement prévue à cet effet.
7. Les contenus dynamiques doivent disposer d’une stratégie claire de traduction ou de langue de référence.
8. Les droits d’accès, règles métier et contrôles de sécurité doivent rester indépendants de la langue sélectionnée.
9. Les changements de langue ne doivent pas modifier les données métier ni contourner les contrôles d’autorisation.

## Architecture technique attendue

- Utiliser une couche d’internationalisation (i18n) compatible avec Next.js App Router.
- Organiser les traductions dans des ressources séparées par langue.
- Utiliser des clés stables plutôt que des phrases comme identifiants de traduction.
- Prévoir une gestion des traductions manquantes avec un comportement de repli maîtrisé.
- Éviter les traductions automatiques côté client qui exposeraient des données ou secrets.
- Prévoir le formatage localisé des dates, nombres, devises et autres éléments lorsque nécessaire.
- Prévoir la compatibilité avec les URL/locales si cette stratégie est retenue.

## Langues

La liste définitive des langues initiales doit être confirmée avant activation en production. L’architecture doit toutefois être multi-langue dès sa conception et permettre d’en ajouter d’autres ultérieurement.

## Qualité et tests

Avant de considérer le multilinguisme comme terminé :

- vérifier que chaque écran important peut être rendu dans chaque langue activée ;
- détecter les clés de traduction manquantes ;
- tester les formulaires, erreurs et notifications dans chaque langue ;
- tester les changements de langue sur les espaces candidat, entreprise, consultant, administration et Owner ;
- vérifier qu’aucune information sensible n’est exposée par le système de traduction ;
- vérifier que le changement de langue ne modifie aucun droit ni état métier ;
- exécuter typecheck, build et tests concernés.

## Statut

Cette exigence est validée fonctionnellement mais son implémentation doit être vérifiée dans le code avant d’être considérée comme terminée.
