# Validation pièce jointe offre

Le test `tests/offer-attachment-validation.ts` vérifie que les colonnes de stockage de la pièce jointe sont disponibles après migration Prisma.

La validation fonctionnelle complète doit être réalisée sur une preview : upload PDF/DOC/DOCX, refus d'un format non autorisé, refus au-delà de 10 Mo et téléchargement réservé au membre de l'entreprise propriétaire de l'offre.
