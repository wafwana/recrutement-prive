# Recrutement Privé — Cadre juridique, contractuel et comptable international

## 1. Objectif

Créer un cadre contractuel et administratif capable de gérer des entreprises françaises et étrangères sans supposer qu'une seule loi nationale s'applique à toutes les situations.

Le système doit distinguer :

- loi applicable au contrat ;
- juridiction/tribunal compétent ;
- règles impératives applicables malgré le choix de loi ;
- règles liées au recrutement et au pays d'exécution ;
- données personnelles et transferts internationaux ;
- fiscalité, TVA et facturation ;
- preuve, signature et archivage ;
- obligations comptables et piste d'audit.

## 2. Documents contractuels

### Convention-cadre

Modèle destiné aux relations durables avec une entreprise. Il doit prévoir les prestations, modalités de commande, rémunération, facturation, confidentialité, données, responsabilités, durée, résiliation, droit applicable, règlement des litiges et annexes.

### Convention simple

Modèle allégé pour une mission ponctuelle, sans perdre les clauses indispensables de rémunération, confidentialité, données, responsabilité, résiliation, droit applicable et règlement des litiges.

### Engagement de l'entreprise

Document permettant de formaliser l'acceptation des conditions essentielles d'une mission : identité et capacité du signataire, poste/mission, périmètre, rémunération, déclencheur de facturation, obligations de coopération, confidentialité et acceptation des documents contractuels associés.

### Clauses et annexes

Le système doit pouvoir composer un dossier selon le contexte :

- confidentialité ;
- RGPD et traitement des données ;
- transferts internationaux de données lorsque nécessaires ;
- responsabilité et limites adaptées au droit applicable ;
- rémunération, TVA/fiscalité et facturation ;
- remplacement/garantie lorsqu'une garantie est commercialement retenue ;
- annulation et résiliation ;
- propriété intellectuelle lorsque nécessaire ;
- non-sollicitation lorsque juridiquement et commercialement pertinente ;
- force majeure ;
- notifications ;
- preuve électronique et signature ;
- droit applicable ;
- juridiction ou mécanisme de règlement des litiges ;
- langue contractuelle et version faisant foi.

## 3. International — principe de conception

Pour les contrats civils et commerciaux entrant dans le champ du règlement Rome I, les parties peuvent choisir la loi applicable. En l'absence de choix, les règles de conflit déterminent la loi applicable ; pour un contrat de prestation de services, le règlement prévoit en principe la loi du pays où le prestataire a sa résidence habituelle, sous réserve des autres règles et circonstances pertinentes.

Le choix d'une loi ne permet pas d'écarter automatiquement les dispositions impératives qui restent applicables dans certaines situations.

Référence primaire : règlement (CE) n° 593/2008 (Rome I), notamment articles 3, 4 et 9.

## 4. Moteur de cadrage contractuel

Avant de générer une convention, la plateforme doit recueillir au minimum :

1. pays de l'entreprise ;
2. pays de Recrutement Privé ;
3. pays du candidat lorsque pertinent ;
4. pays d'exécution de la prestation/recrutement ;
5. nature de la relation (B2B, recrutement, prestation, autre) ;
6. loi choisie, si les parties en choisissent une ;
7. langue du contrat ;
8. monnaie de facturation ;
9. éléments nécessaires à la TVA/fiscalité ;
10. besoin éventuel d'une analyse spécifique avant signature.

Le moteur ne doit jamais afficher qu'une loi est « automatiquement applicable » sans examiner ces éléments.

## 5. Matrice initiale de couverture

| Zone | Cadre à analyser | Niveau |
|---|---|---|
| France | droit français + règles UE applicables | socle |
| UE/EEE | Rome I + droit national + règles impératives | pays par pays |
| Royaume-Uni | droit applicable au contrat + règles locales pertinentes | pays par pays |
| Suisse | droit applicable + règles suisses pertinentes | pays par pays |
| États-Unis | droit fédéral + droit de l'État concerné lorsque nécessaire | État à préciser |
| Canada | droit fédéral/provincial selon le sujet | province à préciser |
| Afrique | droit du pays concerné + conventions/règles régionales pertinentes | pays par pays |
| Autres pays | analyse spécifique avant activation contractuelle | validation requise |

Cette matrice est un cadre de conception et ne remplace pas une validation juridique locale.

## 6. Parcours plateforme

### Entreprise

Profil entreprise → pays → vérification des informations → choix du type de convention → analyse du cadre contractuel → génération du dossier → lecture → acceptation/signature → horodatage → archivage → activation de la relation → facturation selon le contrat.

### OWNER / ADMIN

Le système doit permettre la supervision des modèles, versions, pays activés, clauses et dossiers contractuels. Les actions sensibles doivent être journalisées.

Le rôle ADMIN ne doit jamais pouvoir modifier ou révoquer l'OWNER. Les changements sensibles de cadre contractuel doivent être traçables et, selon leur nature, soumis à validation de l'OWNER.

## 7. Comptabilité et facturation

La conception doit séparer :

- prix commercial ;
- base de facturation ;
- devise ;
- TVA/taxe applicable ;
- date du fait générateur selon le cadre retenu ;
- échéance ;
- statut de facture ;
- paiement ;
- avoir/remboursement ;
- justificatifs ;
- piste d'audit.

Aucune règle fiscale internationale ne doit être codée comme universelle : la TVA, les taxes locales et les obligations déclaratives doivent être déterminées selon le pays, la nature du client, la localisation de la prestation et les règles fiscales applicables.

## 8. Sécurité et conformité

Les documents signés doivent être versionnés et leur intégrité vérifiable. Le système doit conserver la date, l'identité du signataire, la version du document accepté et les événements importants du parcours.

Les données de candidats ne doivent être accessibles qu'aux personnes autorisées. Le choix d'une loi contractuelle ne doit jamais modifier les droits d'accès ni les contrôles de sécurité.

## 9. Statut d'intégration

Cette spécification constitue la base du chantier juridique/comptable international. Les modèles contractuels, le moteur de règles, le stockage des dossiers signés, la facturation et les contrôles doivent être implémentés progressivement et vérifiés avant mise en production.

Les modèles destinés à être effectivement signés doivent être revus par un avocat compétent dans les juridictions ciblées. Les traitements comptables et fiscaux doivent être validés par un expert-comptable ou conseil fiscal lorsque nécessaire.
