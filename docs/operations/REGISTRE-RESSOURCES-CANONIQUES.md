# Registre canonique des ressources et connexions

## Règle impérative pour tous les agents et outils

Ce registre est la référence commune pour identifier les ressources du projet. Avant toute lecture, modification, déploiement ou diagnostic via GitHub, Vercel, Neon, un chatbot, Copilot, Jules ou une autre intégration :

1. Lire ce registre et les instructions applicables du dépôt.
2. Identifier la ressource par son **identifiant canonique**, jamais par un nom approximatif ou un libellé d'interface seul.
3. Utiliser l'identifiant propre au fournisseur dans l'appel correspondant. Un nom de projet identique ne garantit pas que deux fournisseurs parlent de la même ressource.
4. En cas de résultat « introuvable », vérifier d'abord le compte/équipe/espace (scope), le projet sélectionné, le type d'identifiant et les alias enregistrés. Ne pas conclure à une suppression ou à un dépassement de quota sur la seule base d'une erreur 404.
5. Ne jamais deviner un ID, remplacer un ID manquant par un nom supposé, ni basculer vers un autre compte/équipe pour contourner l'erreur.
6. Si une valeur manque ou est ambiguë, la marquer **À CONFIRMER** et demander/faire une vérification ciblée dans le fournisseur concerné avant toute action.
7. Toute découverte ou modification validée doit être reportée ici dans la même PR, avec la date, la source de vérification et les alias utiles.
8. Ne jamais inscrire ici de clé API, token, mot de passe, secret, chaîne de connexion complète ni donnée personnelle. Les secrets restent dans les coffres/env vars du fournisseur.

## Identité canonique du projet

| Champ | Valeur canonique | Alias / notes |
|---|---|---|
| Projet métier | `Recrutement Privé` | Nom court : `RP` |
| Dépôt GitHub | `wafwana/recrutement-prive` | Toujours utiliser le propriétaire et le dépôt complets |
| Branche de production | `main` | Ne pas pousser directement sur `main` ; passer par PR |
| Domaine principal | `recrutement-prive.com` | `www.recrutement-prive.com` |
| Domaine Vercel historique | `recrutement-prive.vercel.app` | Alias de domaine, pas identifiant de projet |
| Projet Vercel | **À CONFIRMER** | Ne pas confondre nom affiché, slug, project ID et équipe |
| Équipe Vercel | **À CONFIRMER** | Toujours utiliser le team ID/slug vérifié avec le projet |
| Projet Neon | **À CONFIRMER** | Le project ID Neon est distinct du nom du projet et du dépôt GitHub |
| Branche/base Neon de production | **À CONFIRMER** | Ne jamais déduire cette valeur du nom GitHub ou Vercel |

## Convention de nommage

- Nom humain stable : `Recrutement Privé`.
- Identifiant de dépôt : `wafwana/recrutement-prive`.
- Identifiants techniques : conserver exactement les IDs fournis par chaque fournisseur (GitHub repository, Vercel project/team, Neon project/branch).
- Les noms affichés et alias servent uniquement à la recherche secondaire. Ils ne remplacent jamais les identifiants techniques.
- Comparer les noms sans tenir compte de la casse ou des accents uniquement pour retrouver un candidat possible ; confirmer ensuite avec l'ID exact.
- Ne jamais renommer une ressource fournisseur pour la faire correspondre à ce registre sans validation OWNER et analyse d'impact.

## Résolution des erreurs « ressource introuvable »

Ordre de vérification, sans action destructive :

1. Confirmer le fournisseur et le type de ressource recherché.
2. Confirmer le compte, l'organisation ou l'équipe active.
3. Rechercher par ID exact si connu ; sinon par nom canonique et alias.
4. Vérifier que le projet est bien lié au bon dépôt et au bon environnement (production/preview).
5. Distinguer une erreur de scope/ID/permissions (par exemple 404) d'une erreur de quota, de facturation ou de déploiement.
6. Ne modifier aucun paramètre, ne recréer aucun projet et ne déclencher aucun déploiement pour « tester » sans preuve et autorisation.

## Portée et séparation des plateformes

- **Pôle 1** : plateforme de recrutement existante. Préserver les parcours et la démonstration en production.
- **Pôle 2** : solutions technologiques et plateformes sur mesure, isolées fonctionnellement du Pôle 1 ; seules les intégrations explicitement approuvées sont permises.
- **Studio Event 59** et **Diagnostique Téléradiologie Afrique** sont des projets distincts : ne jamais leur attribuer les identifiants, dépôts, bases ou projets Vercel de Recrutement Privé.

## Journal des valeurs vérifiées

| Date (UTC) | Fournisseur | Valeur vérifiée | Source / preuve |
|---|---|---|---|
| 2026-11-12 | GitHub | Dépôt `wafwana/recrutement-prive`, branche `main` | Dépôt GitHub consulté |
| 2026-11-12 | Vercel | Projet et équipe : à confirmer | Une recherche avec le nom de projet seul a retourné 404 ; cela ne prouve ni suppression ni dépassement de quota |

Toute mise à jour doit rester factuelle et ne contenir aucun secret.
