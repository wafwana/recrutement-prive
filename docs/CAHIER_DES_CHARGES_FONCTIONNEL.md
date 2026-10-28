# Cahier des charges fonctionnel et technique — Recrutement Privé

**Version :** 1.0  
**Date de consolidation :** 16 octobre 2026  
**SHA applicatif fonctionnel de référence :** bcc26485a4f248503bf0f06335aca55ae28a2f32 (sourcing sûr, navigation OWNER persistante et répertoire partenaires amélioré)  
**Déploiement de référence :** Vercel production dpl_FUUYbynnkvaNsBCt49vK1ygj2crE et recrutement-prive-4swf dpl_694AvcpmKVLocPtEWU2j3ksTYQVF, les deux en état READY sur le commit bcc26485a4f248503bf0f06335aca55ae28a2f32  
**Document complémentaire :** ce document détaille le périmètre produit. Les règles de gouvernance et la procédure obligatoire A à Z restent définies dans CAHIER_DES_CHARGES.md.

> Statut à lire correctement : READY indique que le déploiement technique est prêt. Cela ne remplace pas les tests fonctionnels en production sous des sessions OWNER, CANDIDAT et ENTREPRISE.

## 1. Objet et principes

Recrutement Privé est une plateforme SaaS de chasse de tête et de recrutement haut de gamme. Elle réunit la CVthèque, le traitement des CV, le classement par métiers, le sourcing de candidats et d'offres, le matching, les dossiers de mise en relation, les espaces des parties prenantes, le suivi des recrutements et les contacts sécurisés.

Le présent cahier des charges décrit l'état fonctionnel connu, les règles à conserver, les contrôles d'acceptation et les travaux encore nécessaires. Il ne constitue pas une autorisation de refaire la plateforme, de modifier les données de production ou d'acheter de nouveaux services.

Principes impératifs :
- faire évoluer le code actuel et réutiliser les services, routes, schémas et composants déjà présents ;
- garder une source de vérité unique : dépôt GitHub, branche de travail, PR, CI, commit de fusion et SHA Vercel ;
- ne jamais considérer une ancienne PR ouverte comme preuve qu'une fonctionnalité manque : comparer son contenu au code actuel ;
- ne jamais transformer une proposition du moteur en décision automatique de recrutement ;
- protéger les coordonnées et l'identité des candidats jusqu'à l'étape d'autorisation prévue ;
- conserver les preuves de validation et signaler explicitement ce qui reste non vérifié.

## 2. Acteurs, rôles et autorisations

| Rôle | Responsabilités fonctionnelles | Restrictions impératives |
|---|---|---|
| OWNER | Autorité suprême, supervision globale, pilotage, gestion des administrateurs, permissions, sourcing et décisions de présentation autorisées. | Le compte OWNER existant est intouchable. Il ne peut être supprimé, remplacé, rétrogradé, verrouillé ou recréé par une évolution. |
| ADMIN | Opérations déléguées selon le catalogue de permissions et les droits accordés par OWNER. | Ne peut pas créer, désigner, remplacer, suspendre ou révoquer un OWNER ni modifier ses droits. Ne peut pas modifier son propre rôle pour s'élever en privilèges. |
| CONSULTANT | Suivi des recrutements, pipeline et actions métiers autorisées par les permissions effectives. | Aucun accès implicite à une fonctionnalité sensible ; les contrôles sont réalisés côté serveur. |
| ENTREPRISE | Gestion des données de son entreprise, offres, candidatures visibles et processus de présentation ou de contact autorisé. | Isolation stricte entre entreprises, contrôle par appartenance à l'entreprise, aucune lecture ou écriture inter-entreprises non autorisée. |
| CANDIDAT | Gestion de son profil, CV, documents, candidatures et échanges permis. | Pas d'accès aux données d'un autre candidat ni de publication publique des coordonnées privées. |
| Visiteur | Consultation de la partie publique et accès aux points d'entrée d'inscription/connexion. | Les données privées des candidats, entreprises et espaces connectés sont protégées. |

Les permissions déléguées sont stockées dans le mécanisme de paramètres utilisateur existant et doivent échouer de manière fermée. Les changements sensibles doivent être motivés, journalisés et, selon le risque, soumis à validation ou réversibles.

## 3. Périmètre fonctionnel

### 3.1 Site public et présentation premium

Le site public présente le cabinet, ses services, les entreprises, les candidats et les familles de métiers, avec un accès vers la connexion et les espaces dédiés. Le design de référence utilise le bleu nuit, l'orange/cuivre et des fonds clairs. Le Hero approuvé et le médaillon de marque doivent être conservés lorsqu'une évolution porte sur d'autres sections.

Le rendu visuel sur ordinateur, tablette et mobile doit être contrôlé après les changements visuels. La présence d'assets dans le dépôt n'est pas une preuve suffisante de leur validité ou de leur emploi réel.

### 3.2 Espaces connectés

- Candidat : profil, documents et CV, candidatures, suivi et messagerie autorisée.
- Entreprise : identité d'entreprise, offres, candidatures, profils anonymisés présentés, suivi du recrutement et contacts autorisés.
- Consultant : suivi et pilotage métier via les permissions disponibles.
- OWNER : cockpit général, CVthèque, dossiers métiers, sourcing, matching, entreprises, offres et centre Executive Search.
- ADMIN : gestion déléguée selon les permissions accordées par OWNER ; aucune autorité sur OWNER.

Les écrans doivent utiliser les données persistées et des états vides explicites. Il est interdit d'afficher de faux candidats, de fausses offres ou de faux indicateurs pour masquer l'absence de données.

### 3.3 CVthèque et traitement documentaire

Le flux fonctionnel couvre l'import, la détection du format, l'extraction de texte, l'analyse, la classification, la conservation de la provenance, le classement dans les dossiers et le matching. Les formats prévus par l'analyse locale comprennent PDF, DOCX, TXT et MD. Un chemin déterministe local permet d'extraire des faits du CV même en l'absence d'un fournisseur IA configuré ; ce chemin ne doit pas émettre d'appel réseau lorsque le fournisseur IA est absent.

Exigences :
- valider l'extension, le type réel du fichier et les signatures binaires pertinentes ;
- traiter les documents vides, corrompus ou non lisibles sans faire échouer toute la file ;
- ne pas inventer compétences, expériences, langues ou certifications ;
- enregistrer les résultats, la date d'analyse et les éléments de provenance ;
- éviter le rattachement arbitraire d'un CV à un compte candidat ;
- protéger l'accès et les URL des documents côté serveur ;
- distinguer un CV importé/analyse OK d'un candidat validé, joignable ou présenté à une entreprise.

### 3.4 Taxonomie, dossiers et recherche proactive

Les secteurs et métiers structurent les profils, les offres, la CVthèque et le sourcing. Les codes, catégories parentes et sous-catégories doivent rester cohérents entre profil candidat, offre entreprise, dossiers et moteur de matching. Les nouvelles spécialités doivent être ajoutées au référentiel existant avec leurs tests et leur rattachement correct.

Le parcours OWNER permet de lancer une recherche depuis les familles de métiers, indépendamment de l'existence d'une offre, et de classer les résultats dans le bon vivier. Toute nouvelle recherche est auditable. Un candidat détecté ou classé automatiquement n'est pas réputé validé ni contacté.

### 3.5 Sourcing d'offres et de candidats

Le sourcing doit :
- consulter uniquement les sources réellement configurées et accessibles ;
- journaliser la provenance et l'heure de collecte ;
- identifier les erreurs de source sans bloquer les sources suivantes ;
- dédupliquer les offres et profils via leurs clés de provenance ;
- borner le travail par exécution et conserver un curseur de progression ;
- continuer à qualifier et matcher les offres dans les étapes déjà existantes ;
- conserver le vivier interne et les CV analysés comme sources internes, sans contact automatique ;
- ne jamais traiter un code HTTP 400 ou 403 historique comme résolu sans preuve récente ou expliquer une limite d'accès externe.

La PR 288, fusionnée dans le commit 34882bef037f99f6b52b071ed03739044b7dd4b6, limite le cron global d'offres à une source configurée et deux offres au maximum par invocation, avec rotation persistante entre sources. Elle ne modifie ni la fréquence des crons ni le schéma Prisma. Le déploiement de ce commit est READY ; les résultats métier du prochain cycle automatique restent à confirmer dans les journaux de production.

### 3.6 Matching et aide à la décision

Le moteur compare les compétences, l'expérience, le titre, le contexte, la localisation et la taxonomie lorsque ces données sont disponibles. Les propositions comportent un score indicatif, les compétences communes, les écarts à vérifier et les raisons de la correspondance. Un score ne constitue pas une décision d'embauche.

L'écran de matching OWNER permet d'examiner les paires candidat/offre et de préparer une présentation confidentielle via le flux d'audit existant. La vérification de la permission, du doublon et des conditions doit être faite côté serveur. Les noms et coordonnées directs ne doivent pas apparaître dans les vues anonymisées.

### 3.7 Executive Search & Secure Interview Center

Le centre comprend les onglets suivants : Vue d'ensemble, Matching candidats/offres, Présentations, Entretiens sécurisés, Autorisations, Décisions et Prospection.

Exigences par section :
- Vue d'ensemble : indicateurs issus de la base, parcours de suivi et raccourcis vers les opérations existantes.
- Matching : propositions réelles, anonymisées, explicables et action de préparation de présentation soumise à autorisation.
- Présentations : suivi des dossiers anonymisés, de leur état et du nombre de contacts réalisés.
- Entretiens sécurisés : suivi des demandes, des créneaux, du canal, de la durée et de l'état du contact.
- Autorisations : actions explicites autoriser/refuser via l'API existante et journalisation.
- Décisions : mise en évidence des décisions attendues ; la décision de recrutement appartient à l'entreprise, pas au système.
- Prospection : suivi traçable des événements et de leur provenance, sans exposition des adresses directes dans les listes de pilotage.

Les contacts dans la plateforme sont prévus pour une durée de 30 minutes. L'interface actuelle affiche 99 EUR TTC par contact ; toute communication contractuelle ou modification tarifaire doit vérifier les règles de facturation et de paiement existantes. Tout enregistrement de visioconférence est interdit avant le consentement explicite des deux participants. Aucun contact externe ne doit être envoyé automatiquement par le seul fait qu'un matching existe.

### 3.8 Entreprises, sources et partenaires

L'identité entreprise et les éléments SIREN/SIRET soutiennent la préqualification et les formulaires. La provenance des données, les accords, les contacts et l'historique partenaires doivent être tracés dans les modèles existants de partenaire. L'interface ne doit jamais confondre donnée préremplie, donnée vérifiée et accord accepté.

### 3.9 Internationalisation et IA

La base du projet prévoit le français par défaut et une interface multilingue. Les langues activées doivent être contrôlées dans les dictionnaires et les tests du dépôt avant de déclarer une couverture complète. Les contenus IA doivent respecter les schémas attendus, les délais et reprises bornés, les règles de confidentialité et le fournisseur de secours. Les clés API restent exclusivement dans les paramètres d'environnement sécurisés et ne sont jamais ajoutées à la documentation, au code client ou aux journaux.

### 3.10 Navigation opérationnelle et accessibilité des onglets

La navigation OWNER doit rester disponible sur les pages de l'espace connecté, y compris la bibliothèque documentaire et l'écran historique de permissions `/owner/permissions`. Les outils les plus fréquents apparaissent en accès direct : Vue d'ensemble, Candidats, CVthèque, Métiers & dossiers, Sourcing, Matching et Executive Search. Les autres fonctions sont regroupées par domaine pour éviter une liste unique trop longue : recherche/sourcing, entreprises/offres, CV/documents, partenaires/finances et équipe/gouvernance.

Critères d'acceptation :
- barre visible uniquement pour une session dont le rôle réel est `OWNER`, sans modifier les permissions côté serveur ;
- indication explicite de la page active et liens clavier avec focus visible ;
- menu détaillé ouvrable/réductible, avec ouverture automatique sur une sous-page de la section correspondante ;
- chaque destination pointe vers une page existante ou vers une ancre de section existante du cockpit ;
- contrat automatisé qui vérifie les 33 destinations, la condition OWNER et les états d'accessibilité ; test exécuté par la CI générale et la porte OWNER ;
- les pages et API conservent leurs contrôles d'accès habituels. Afficher un lien ne confère aucun droit.

## 4. Architecture et services

| Élément | Rôle attendu | Contrôle de gouvernance |
|---|---|---|
| GitHub — wafwana/recrutement-prive | Code source, branches, PR, historique et workflows CI. | Travailler sur une branche dédiée ; ne pas remplacer main par un état ancien ; conserver un point de restauration avant les fusions significatives. |
| GitHub Actions | OWNER Compatibility Gate, migrations sur base de test, tests sécurité/fonctionnels, typecheck et build. | Les résultats doivent correspondre au SHA de la PR qui sera fusionnée. |
| Vercel — projet recrutement-prive | Builds et déploiements de production/preview Next.js. Le domaine public est rattaché à ce projet. | Après fusion, vérifier le SHA et l'état READY ; ne pas confondre une preview avec le domaine public. |
| Vercel — recrutement-prive-4swf | Deuxième projet connecté aux mêmes modifications dans les contrôles Vercel. | Le garder comme cible secondaire jusqu'à vérification du rôle exact du projet ; ne pas y déplacer le domaine public sans décision explicite. |
| PostgreSQL / Neon | Persistance applicative et historique métier selon la configuration de production. | Aucun accès destructif sans sauvegarde, vérification du schéma réel et plan de retour arrière. |
| Prisma | Modèles, client de données et migrations. | Génération et contrôles de migrations ; en cas de P3009/divergence, commencer par un diagnostic lecture seule. |
| Auth.js | Authentification et sessions. | Vérifier les parcours selon le rôle réel ; ne pas exposer les secrets de session. |
| OpenAI et Gemini | Assistance IA sur les opérations compatibles, avec garde-fous et résolution de fournisseur. | Aucun appel IA ne doit justifier l'invention de faits ; les erreurs permanentes doivent être distinguées des erreurs transitoires. |
| pdf-parse et mammoth | Extraction locale des PDF et DOCX. | Tester fichiers valides, vides et corrompus ; un avertissement de bundling ne vaut pas échec si le build réussit, mais ne remplace pas le test d'import réel. |
| Resend | Service e-mail présent dans les dépendances. | Contrôler les destinataires, modèles, consentements et secrets avant tout envoi. |
| Jules | Agent de développement délégué utilisé dans le flux de projet. | Les PR générées restent soumises à la revue, aux tests, à la compatibilité OWNER et au processus de fusion ; aucun agent ne peut contourner la gouvernance. |

Ne documenter que la présence d'un service, jamais une clé, un mot de passe, un token, une URL avec secret ou une donnée personnelle. Ne pas souscrire à un produit payant sans demande explicite.

## 5. Tâches programmées

Le fichier vercel.json référence les exécutions suivantes :

| Minute UTC de l'heure | Route | Finalité |
|---|---|---|
| 00 | /api/cron/global-jobs | Collecte et qualification des offres externes, désormais bornées et rotatives. |
| 15 | /api/cron/cv-rematch | Recalcul programmé du matching des CV selon la fenêtre configurée. |
| 30 | /api/cron/enterprise-offer-sourcing | Sourcing d'offres entreprises. |
| 45 | /api/cron/global-candidates | Sourcing de candidats et alimentation du vivier. |

La fréquence est conservée ; toute modification nécessite un besoin démontré, des tests de calendrier et une revue du risque de charge. Les crons authentifiés ne doivent pas être déclenchés manuellement avec des secrets de production pour un test exploratoire.

## 6. Commandes et scripts package.json

### Exploitation et build
- dev : démarrage local Next.js.
- build : génération Prisma puis build de production Next.js.
- start : démarrage du serveur de production local.
- lint : contrôle ESLint.
- typecheck : compilation TypeScript sans émission.
- db:generate : génération du client Prisma.
- db:migrate : migration de développement Prisma.
- db:deploy : application des migrations en environnement prévu.
- db:seed : seed contrôlé ; le seed ne doit pas créer un second OWNER.

### Tests fonctionnels et de sécurité

| Script | Objet principal |
|---|---|
| test:mission-lock | Verrou de présentation et état de mission. |
| test:candidate-auth | Contrôles d'authentification candidat. |
| test:candidate-flow | Flux candidat. |
| test:company-flow | Flux entreprise et isolation. |
| test:taxonomy-cv-protection | Taxonomie et protection CV. |
| test:candidate-integration | Intégration candidat. |
| test:global-sourcing | Collecte et sourcing global. |
| test:sourcing-candidate-status | Préservation des états de candidats sourcés. |
| test:proactive-search | Recherche proactive par taxonomie. |
| test:enterprise-sourcing-batch | Lots de sourcing entreprise. |
| test:enterprise-candidate-matches | Matching entre entreprises/offres et candidats. |
| test:cv-intelligence | Analyse et extraction CV. |
| test:cv-folder-classification | Classification et rangement des CV. |
| test:cv-rematch-batch-window | Fenêtres de recalcul de matching. |
| test:cron-schedule | Vérification des calendriers des crons. |
| test:global-jobs-cron-batch | Rotation et bornage du cron d'offres. |
| test:owner-cv-intake | Parcours HTTP import CV et opérations OWNER. |
| test:owner-compatibility | Barrière de compatibilité OWNER. |
| test:migration-check | Contrôles de migrations. |
| test:internal-messaging | Messagerie et confidentialité documentaire. |
| test:trusted-video | Sécurité visioconférence. |
| test:ai-provider | Résolution du fournisseur IA. |
| test:gemini-schema-normalization | Contrat de sortie structurée Gemini. |
| test:gemini-retry | Reprises IA bornées. |
| test:secure-contact | Contrat des contacts sécurisés. |
| test:executive-search | Présentation confidentielle et contacts sécurisés. |
| test:secure-contact-authorization | Autorisations du contact sécurisé. |
| test:admin-partners-security | Sécurité des opérations ADMIN/partenaires. |
| test:security | Contrôles de sécurité dédiés. |
| test:global-back-navigation | Navigation de retour. |
| test:sector-visuals | Couverture des visuels sectoriels. |
| test:owner-permissions-governance | Gouvernance des permissions OWNER/ADMIN. |
| test:api-authorization-matrix | Matrice d'autorisations des API candidat/entreprise. |
| test:cv-matching-dashboard | Contrat du dashboard de matching. |
| test:secure-contact-payments | Contrats de paiement des contacts. |

Le script test:company-flow, comme certains tests d'intégration, peut avoir des scénarios qui nécessitent une base de test configurée. La CI doit les exécuter selon le contrat du workflow et ne pas présenter un test ignoré faute de base comme une validation d'intégration réelle.

## 7. Conditions d'acceptation de bout en bout

Une livraison est acceptée uniquement si les points applicables ci-dessous sont prouvés sur le code et l'environnement concernés.

| Domaine | Preuve minimale attendue |
|---|---|
| Git | PR reliée au main courant, diff inspecté, absence de changement hors périmètre, point de restauration défini avant fusion. |
| OWNER/ADMIN | OWNER Compatibility Gate réussie ; le compte OWNER et ses permissions demeurent intacts. |
| Sécurité API | Tests rôles manquants/incorrects, accès refusés côté serveur et isolation inter-entreprises. |
| Données/migrations | Prisma généré ; historique et schéma contrôlés ; aucun changement risqué non réconcilié. |
| Fonctionnel | Tests unitaires ciblés et parcours complets du rôle impacté. |
| Types/build | Typecheck et build réussis sur le SHA candidat. |
| Déploiement | SHA de fusion égal au SHA déployé sur le projet et l'environnement attendus ; Vercel READY sans erreur d'alias. |
| CV | Dépôt d'un fichier réel, extraction visible, analyse traçable et classement conforme ; pas de donnée inventée ni de contact automatique. |
| Sourcing | Au moins un cycle programmé observable, source traitée, progression du curseur et erreurs éventuelles consignées sans secrets. |
| Matching/présentation | Propositions anonymisées, doublons revérifiés côté serveur, préparation explicitement autorisée et journalisée. |
| Contact sécurisé | Autorisation, paiement requis le cas échéant, durée/canal conformes, consentement des deux parties avant enregistrement. |
| Production | Smoke tests authentifiés sur les rôles réellement disponibles. Si l'identité manque, inscrire « non vérifié — accès externe requis ». |

## 8. État connu au 16 octobre 2026

### Changements fonctionnels fusionnés et preuves automatiques

- Code applicatif de référence : `bcc26485a4f248503bf0f06335aca55ae28a2f32`. Les commits de documentation ultérieurs peuvent faire avancer `main` sans modifier le code métier.
- Sourcing global d'offres — PR #288 : chaque invocation traite une source configurée et deux offres au maximum ; la rotation est persistante et les erreurs d'une source ne doivent pas affamer les suivantes.
- Résolution sûre de configuration des sources candidats — commit `0a4553b90e69fe411b8de9e92996a1156a363cb2` : le moteur utilise les sources configurées effectives, refuse l'édition en base quand la configuration est pilotée par l'environnement et n'écrit pas les chemins/paramètres sensibles des URL dans les journaux. Test dédié `test:candidate-sourcing-config`.
- Executive Search — PR #290 : vue d'ensemble avec actions prioritaires basées sur les données existantes, matching préchargé et raccourcis entre Présentations, Entretiens, Autorisations, Décisions et Prospection ; aucune mise en relation/contact/décision de recrutement n'est déclenché automatiquement.
- Base candidats OWNER — PR #291 : le compteur porte sur les comptes actifs `CANDIDAT` ; le lien ouvre une page dédiée réservée à OWNER qui utilise l'API de documents protégée existante.
- Navigation de travail OWNER — PR #295 : accès persistant sur les écrans connectés, sept raccourcis prioritaires, cinq groupes de fonctions, état actif et focus clavier ; elle est également disponible sur l'écran historique `/owner/permissions`. Le test `test:owner-workspace-navigation` vérifie les 33 destinations réelles et s'exécute dans la CI générale et la porte OWNER.
- Partenaires & Sources — PR #296 : le répertoire de découverte précise qu'il s'agit d'un catalogue institutionnel intégré et filtré, non d'une collecte Web en direct ; il montre le nombre de résultats et le total initial, propose une remise à zéro et des états accessibles, et marque un organisme déjà importé pendant la session.
- Les PR #295 et #296 ont passé OWNER Compatibility Gate, `verify`, typecheck/build et les deux previews Vercel avant fusion. Des points de restauration avant/après fusion sont présents pour ces livraisons.

### Déploiement vérifié

Le projet Vercel principal `recrutement-prive` a le SHA `bcc26485a4f248503bf0f06335aca55ae28a2f32` en état `READY` dans `dpl_FUUYbynnkvaNsBCt49vK1ygj2crE`, avec le domaine public rattaché. Le projet `recrutement-prive-4swf` affiche lui aussi `READY` pour le même SHA, vérifié dans le déploiement `dpl_694AvcpmKVLocPtEWU2j3ksTYQVF`. Les deux statuts Vercel sont réussis.

### Restant à vérifier manuellement en production

1. Avec une vraie session OWNER, ouvrir la navigation persistante, les 7 accès rapides et le menu « Toutes les fonctions », y compris la page `/owner/permissions`.
2. Vérifier les comptes candidats réels, leurs métadonnées et l'ouverture des documents via l'API protégée ; confirmer que le compte OWNER et les autres rôles ne sont pas répertoriés comme candidats.
3. Importer/analyser un CV représentatif sous une session autorisée, vérifier classement/matching et l'absence d'exposition non autorisée.
4. Observer les prochains cycles programmés du sourcing, la rotation persistante, les checkpoints et les erreurs de sources ; ne pas déclencher de cron de production manuellement avec le secret réel.
5. Reconfirmer les parcours IA et les sources externes touchés par les anciennes erreurs HTTP signalées avec les journaux récents, sans révéler de secret.
6. Contrôler visuellement le Hero et les visuels sectoriels sur ordinateur, tablette et mobile.
7. Exécuter un scénario de bout en bout avec des identités distinctes CANDIDAT et ENTREPRISE.

Les tests automatisés verts et un déploiement `READY` ne valent pas preuve d'une session réelle authentifiée. Tant que les scénarios ci-dessus ne sont pas observés, la validation métier complète reste ouverte.

## 9. Gouvernance des évolutions et définition de terminé

Toute évolution suit le cahier des charges maître et la séquence suivante :
1. relever main, SHA, branches, PR, état Vercel et tests liés au code actuel ;
2. consulter le registre des correctifs validés avant de rouvrir un incident ;
3. proposer une branche dédiée construite sur main courant ;
4. faire le changement minimal et ajouter les tests de non-régression ;
5. exécuter tous les checks pertinents, y compris OWNER Compatibility Gate, typecheck et build ;
6. examiner le diff et créer un point de restauration avant fusion ;
7. fusionner uniquement si les contrôles requis sont verts ;
8. vérifier le déploiement Vercel du SHA de fusion et créer le point de restauration post-fusion ;
9. réaliser les smoke tests production réalisables avec les identités disponibles ;
10. mettre à jour le registre des correctifs et ce cahier des charges si le périmètre ou l'état change.

« Terminé » signifie : code intégré, contrôles techniques réussis, déploiement du bon SHA confirmé et test fonctionnel réel réussi pour le périmètre concerné. Toute absence d'accès, d'identité ou de source est signalée précisément comme blocage externe, jamais masquée par une CI verte ou un déploiement READY.


## 12. Suivi d'acceptation et tests OWNER — registre unique

Chaque fonctionnalité décrite dans ce cahier des charges doit être reliée à une ligne unique du registre `docs/operations/REGISTRE-CORRECTIFS-VALIDES.md`. Le cahier des charges définit ce qui doit fonctionner ; le registre indique l'état prouvé de chaque action et les tests qui restent à faire. Ne pas créer une deuxième liste concurrente dans un autre document : ajouter des liens vers le registre.

Pour chaque livraison, consigner : fonctionnalité/parcours, ticket, PR et SHA de fusion, contrôles techniques sur ce SHA, contrôle de compatibilité OWNER/ADMIN, SHA et URL de production si confirmés, tests réels déjà exécutés, puis les étapes restantes pour le test OWNER.

### Checklist de validation en production (à générer selon les changements livrés)
- [ ] Connexion et accès OWNER ; compte, rôle et permissions inchangés.
- [ ] Parcours métier concerné, avec données réelles autorisées et résultat attendu.
- [ ] Autorisations : accès permis accepté, accès interdit refusé côté serveur.
- [ ] Données et documents : association correcte, accès protégé, aucune donnée ni aucun lien inventé.
- [ ] États d'erreur, cas vide, doublons et reprise après échec.
- [ ] Affichage responsive et navigation, si la livraison touche l'interface.
- [ ] Vérification des journaux et de la provenance sans exposer de secrets ou de données personnelles.
- [ ] Résultat, date, environnement et SHA déployé consignés dans le registre.

Ne cocher que les contrôles pertinents à la livraison ; une checklist adaptée ne doit pas devenir une répétition inutile. Les parcours qui nécessitent une identité OWNER, CANDIDAT ou ENTREPRISE authentifiée sont à remettre explicitement à l'OWNER si l'agent ne peut pas les exécuter lui-même. Une action reste « à tester par l'OWNER » jusqu'à son retour réel ; elle ne devient pas « validée » par présomption.


## 13. Cycle d'acceptation après retour de l'utilisateur

Chaque exigence testable doit avoir un résultat attendu observable et un identifiant de suivi stable. Lorsqu'un test utilisateur échoue :
- [ ] consigner le scénario échoué et le résultat observé dans la même ligne de suivi ;
- [ ] marquer l'exigence **Échec du test utilisateur — à corriger** ;
- [ ] relier le ticket de correction à l'identifiant initial, sans dupliquer la fonctionnalité ;
- [ ] reproduire l'échec avec un test automatisé lorsque cela est raisonnablement possible ;
- [ ] corriger et exécuter les contrôles techniques avant fusion ;
- [ ] confirmer le SHA de production après fusion ;
- [ ] fournir une checklist de retest courte ;
- [ ] clôturer uniquement après le retest utilisateur concluant.

Le test utilisateur doit être précis : préconditions, étapes, résultat attendu et comportement en cas d'erreur. L'utilisateur ne doit pas avoir à diagnostiquer le code ou à inventer la solution ; il signale le symptôme, l'équipe technique prend en charge l'analyse et le déblocage.


## 14. Traçabilité des décisions validées

Toute décision validée qui affecte les exigences fonctionnelles, les parcours, les rôles, la confidentialité, les données ou les critères d'acceptation doit posséder une entrée dans le registre de décisions propre à la plateforme. Chaque exigence importante doit pouvoir être reliée à cette décision et à sa tâche de suivi.

L'entrée contient un identifiant stable, une date, le libellé de la décision, son statut, son périmètre, sa justification, ses impacts et les références vers les tickets/PR/tests concernés. Une idée ou une hypothèse ne doit pas être présentée comme une décision validée.

Aucune décision validée ne peut être écartée ou remplacée implicitement. Tout conflit est signalé ; tout remplacement conserve l'historique et le motif. Cette gouvernance doit être présente dès le premier cahier des charges de référence de chaque plateforme, tout en conservant un registre opérationnel distinct pour chaque projet.
