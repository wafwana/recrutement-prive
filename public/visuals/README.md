# Visuels du site Recrutement Privé

## Assets locaux actifs

- `rp-global-skyline.webp` — fond skyline du Hero de la page d’accueil. Sur grand écran, le CSS utilise la composition approuvée `rp-global-partners.jpeg` en meilleure résolution pour le cadrage desktop.
- `rp-global-partners-seal.webp` — médaillon transparent RP Global Partners, séparé du fond Hero.

## Photographies sectorielles

Les images des cartes publiques « Secteurs d’activité & métiers » et du répertoire OWNER « Métiers & dossiers » sont déclarées dans `lib/taxonomy/sector-visuals.ts`. La taxonomie reste la source des codes secteurs : chaque grande famille possède un visuel identifié et ses spécialités réutilisent celui de leur famille, sans créer une galerie par sous-métier.

Les visuels sont chargés directement depuis des pages photo Unsplash individuelles, avec transformation d’image (recadrage, format automatique, qualité 78 et largeur maximale 960 px) et attributs de chargement différé. Les pages source listées dans [le registre d’images sectorielles](../../docs/visuals/SECTOR-IMAGERY.md) indiquaient « Free to use under the Unsplash License » lors de la vérification du 16 octobre 2026.

Avant de remplacer une image, revérifier sa page source, sa disponibilité, la licence affichée et tout éventuel logo, marque ou visage reconnaissable. Les photos illustrent une famille métier ; elles ne représentent pas nécessairement un salarié, client ou partenaire réel de Recrutement Privé.

## Fichiers historiques à ne pas utiliser

Les fichiers `hero-portrait.jpeg`, `cabinet-office.jpeg`, `enterprise-handshake.jpeg` et `ai-human.jpeg` ont été signalés comme images invalides ou tronquées lors de la vérification du 16 octobre 2026. `maquette-reference.png` est un fichier de référence textuel et non une photographie PNG exploitable. Ils ne sont référencés par aucun des nouveaux blocs sectoriels. Ils sont conservés ici à titre d’historique et ne doivent pas être réactivés sans validation technique de leur contenu.

Ne jamais référencer un chemin local comme `/mnt/data/...` depuis l’application. Toute nouvelle ressource locale doit être une véritable image web livrable dans `public/visuals/`, optimisée et accompagnée d’une source/licence documentée.
