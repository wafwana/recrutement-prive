# Outreach, contacts sécurisés et contrats

## Parcours
- Premier contact automatisé distinct pour entreprises et candidats.
- Envoi via le service email existant (Resend), sans activation automatique en production.
- Délivrabilité: SPF, DKIM, DMARC, ramp-up, bounces, complaints, opt-out et anti-duplication.
- Contact uniquement via une présentation active et les canaux internes.
- 30 minutes, 99 € TTC (82,50 € HT à 20 %), facturation/paiement avant confirmation.
- Après 3 contacts réalisés sur une présentation, décision entreprise obligatoire.
- Messagerie TRUST_ANONYMOUS: aliases et blocage des coordonnées, URLs, réseaux sociaux et adresses.
- Visio TRUST: WebRTC/TURN; aucune coordonnée directe exposée.
- Enregistrement/écoute uniquement après information et consentement explicite des deux participants; pas d'enregistrement clandestin.

## Contrats à préparer
1. Conditions du contact sécurisé — entreprise.
2. Conditions du contact sécurisé — candidat.
3. Convention d'entretien sécurisé — entreprise.
4. Charte confidentialité + interdiction de contournement.
5. Notice d'information et consentement à l'enregistrement.
6. Politique messagerie/visio sécurisée.

Ces modèles sont fonctionnels et doivent être validés juridiquement avant signature commerciale.

## Sécurité
- Aucun échange de coordonnées hors plateforme.
- Journalisation des tentatives de fuite.
- Pas de candidature/contact direct créé automatiquement par le matching.
- Envoi email idempotent; bounce/complaint/opt-out bloquent les futurs envois.
- Aucun secret dans les logs.


## Paiement entreprise

Le contact sécurisé est facturé 99 € TTC (82,50 € HT + 20 % TVA). Trois modes sont préparés : carte bancaire via Stripe Checkout, prélèvement SEPA via Stripe, ou virement bancaire avec confirmation financière contrôlée. L'entreprise ne peut initier le paiement qu'après autorisation du cabinet. Le contact ne peut démarrer que lorsque `paymentStatus=PAID`.

Variables nécessaires pour activer les paiements en ligne : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, et `NEXTAUTH_URL`. Aucun paiement réel n'est simulé en l'absence de ces variables. Le webhook Stripe vérifie sa signature avant toute écriture.

Le virement bancaire reste volontairement soumis à confirmation par l'OWNER ou un ADMIN possédant la permission dédiée `FACTURATION`. L'autorisation du contact elle-même reste une permission distincte `SECURE_CONTACTS_AUTHORIZE`.
