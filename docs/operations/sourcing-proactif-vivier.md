# Manuel opératoire — Sourcing proactif et vivier Recrutement Privé

## 1. Objectif

Ce manuel permet de vérifier et d'exploiter la chaîne de sourcing sans modifier directement la base de production :

1. collecter les offres publiques ;
2. qualifier les offres et calculer les correspondances ;
3. rechercher des profils externes publics lorsque les sources le permettent ;
4. utiliser la CVthèque interne comme solution de repli si toutes les sources externes de candidats échouent ;
5. actualiser le vivier et calculer les correspondances candidat–offre ;
6. contrôler les résultats dans les journaux d'audit.

Le sourcing automatique n'autorise **ni contact automatique, ni décision de recrutement automatique**. La validation humaine reste requise avant toute mise en relation.

## 2. Ce que signifiait l'incident du 11 octobre 2026

Les journaux de production indiquaient :

- collecte globale des offres à 03:00 UTC : 10 offres récupérées, 2 qualifiées, 1 offre avec au moins une correspondance ;
- sourcing candidat à 06:00 UTC : les sources GitHub et StackExchange renvoyaient HTTP 403 ; 0 profil externe récupéré ;
- actualisation du vivier proactif : 2 profils internes évalués et 2 enregistrements mis à jour, 0 créé ;
- sourcing des offres par entreprise : 0 entreprise traitée à ce moment-là.

Un code HTTP 403 signifie que la source a refusé la requête. Ce n'est pas la preuve que les profils n'existent pas. Le correctif proposé ajoute des en-têtes d'identification explicites aux requêtes publiques et un repli automatique vers la CVthèque interne lorsque **toutes** les sources externes configurées échouent.

## 3. Ordonnancement automatique

Les tâches planifiées dans `vercel.json` utilisent l'heure UTC :

| Heure UTC | Route | Fonction |
|---|---|---|
| 03:00 | `/api/cron/global-jobs` | Collecte des offres publiques, qualification/matching, rafraîchissement du vivier |
| 04:00 | `/api/cron/cv-rematch` | Recalcul des correspondances de la CVthèque |
| 05:00 | `/api/cron/enterprise-offer-sourcing` | Recherche d'offres pour les entreprises configurées |
| 06:00 | `/api/cron/global-candidates` | Sourcing de candidats et rafraîchissement du vivier |

La présence d'une planification ne prouve pas à elle seule qu'une exécution a réussi. Il faut contrôler les journaux d'audit et les résultats.

## 4. Contrôle de production en lecture seule

Dans Neon, sélectionner le projet Recrutement Privé et exécuter uniquement des requêtes SELECT. Ne jamais afficher de CV, coordonnées, e-mails, noms ou jetons pour ce contrôle.

### A. Dernières exécutions du sourcing

```sql
SELECT
  action,
  "targetType",
  "createdAt",
  details->>'fetched' AS fetched,
  details->>'created' AS created,
  details->>'updated' AS updated,
  details->>'qualified' AS qualified,
  details->>'matched' AS matched,
  details->>'fallbackSource' AS fallback_source,
  details->>'externalSourcesAllFailed' AS external_sources_all_failed
FROM "AuditLog"
WHERE "createdAt" >= NOW() - INTERVAL '7 days'
  AND action IN (
    'GLOBAL_JOB_SOURCING',
    'GLOBAL_CANDIDATE_SOURCING',
    'ENTERPRISE_AUTOMATED_OFFER_SOURCING',
    'CV_AUTOMATIC_REMATCH'
  )
ORDER BY "createdAt" DESC
LIMIT 50;
```

### B. Volumes globaux, sans données personnelles

Adapter les noms de tables si le schéma de la branche déployée diffère :

```sql
SELECT 'ExternalJobOpportunity' AS table_name,
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '24 hours')::int AS last_24h
FROM "ExternalJobOpportunity"
UNION ALL
SELECT 'SourcedCandidate',
       COUNT(*)::int,
       COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '24 hours')::int
FROM "SourcedCandidate"
UNION ALL
SELECT 'CandidateProfile',
       COUNT(*)::int,
       COUNT(*) FILTER (WHERE "updatedAt" >= NOW() - INTERVAL '24 hours')::int
FROM "CandidateProfile";
```

Important : un profil interne mis à jour n'est pas un nouveau candidat externe. Distinguer `created`, `updated`, `fetched` et `matched`.

## 5. Parcours manuel dans l'application

1. Se connecter avec le compte OWNER habituel. Ne pas modifier le rôle, le mot de passe ou les permissions OWNER pour ce test.
2. Ouvrir l'espace de sourcing / vivier selon la navigation actuellement disponible.
3. Vérifier qu'une source ou une recherche peut être sélectionnée et que le résultat affiche la provenance.
4. Vérifier les états de profil (détecté, à qualifier, validé, rejeté, archivé) et le score de correspondance.
5. Vérifier que les profils issus de la CVthèque interne sont identifiés comme tels et ne sont pas présentés comme des profils externes nouvellement collectés.
6. Vérifier qu'un score ou un match n'entraîne ni validation humaine automatique, ni prise de contact automatique.
7. Si le test nécessite un candidat ou une entreprise, utiliser des identités de test dédiées. Ne pas inventer d'identifiants et ne pas modifier les données d'un utilisateur réel.

## 6. Critères d'acceptation

La recette n'est validée que si les points suivants sont observés après le déploiement concerné :

- [ ] L'exécution cron est visible avec un horodatage récent.
- [ ] Les sources externes de candidats renvoient des résultats, **ou** le journal indique explicitement le repli vers `PLATFORM_CVTHEQUE`.
- [ ] Le résultat expose les compteurs de récupération, création, mise à jour et matching.
- [ ] Les profils du vivier sont reliés à des offres qualifiées lorsqu'une correspondance existe.
- [ ] Les profils internes conservent leur provenance et leurs statuts de validation.
- [ ] Aucun contact automatique n'est déclenché par le seul sourcing.
- [ ] Aucun secret, CV ou contact personnel n'est exposé dans les journaux.
- [ ] Les tests CI, le typecheck et le build sont verts.
- [ ] Le déploiement Vercel du commit validé est `READY`.
- [ ] Une vérification réelle après déploiement confirme le résultat ; une ancienne entrée d'audit ne suffit pas.

## 7. Si une source répond encore HTTP 403

1. Ne pas désactiver la protection SSRF et ne pas autoriser une URL arbitraire.
2. Vérifier dans l'audit quelle source a refusé la requête et à quelle heure.
3. Vérifier que le déploiement contient le correctif des en-têtes `User-Agent` et `x-github-api-version`.
4. Vérifier si la source impose une authentification, une limite de débit ou une politique d'accès. Ne jamais ajouter une clé dans le code ou dans les journaux ; si un accès authentifié est réellement nécessaire, le configurer uniquement via les variables d'environnement prévues.
5. Vérifier que le repli interne s'est exécuté et que le journal contient `fallbackSource = PLATFORM_CVTHEQUE` et `externalSourcesAllFailed = true`.
6. Si la CVthèque interne ne contient aucun profil actif, le repli ne peut pas créer de vrais candidats. Il faut alors compléter la CVthèque via le parcours normal d'inscription/import, avec consentement et traitement conforme aux règles de confidentialité.
7. Relancer la recette après correction et consigner le commit, l'heure, les compteurs et l'état du déploiement.

## 8. Sécurité et règles de non-régression

- Ne jamais lancer manuellement une route cron sans son autorisation prévue.
- Ne pas exposer ni copier `CRON_SECRET`, `GEMINI_API_KEY`, `DATABASE_URL` ou d'autres secrets.
- Ne pas effectuer d'écriture SQL de diagnostic, de reset, de suppression ou de migration improvisée.
- Ne pas contourner les protections SSRF.
- Ne pas contacter automatiquement les profils publics ; respecter les conditions d'utilisation des sources, le RGPD et les droits des personnes.
- Ne pas modifier le compte OWNER, les rôles, les migrations ou les données de production pour faire passer le test.
- Une CI verte prouve les contrôles automatisés, pas à elle seule l'intégralité du parcours réel en production.
