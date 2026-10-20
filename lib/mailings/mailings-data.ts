export type MailingCategory = "ENTREPRISES" | "SPONSORS" | "COLLABORATEURS" | "PARTENAIRES";
export type MailingStatus = "BROUILLON" | "PRET_A_VALIDER" | "APPROUVE" | "ARCHIVE";

export type MailingTemplate = {
  id: string;
  code: string;
  name: string;
  category: MailingCategory;
  targetRole: "ENTREPRISE" | "SPONSOR" | "ADMIN" | "CONSULTANT" | "PARTENAIRE";
  language: "fr" | "en";
  sector?: string;
  relationalStage: string;
  subject: string;
  body: string;
  variables: Array<{ code: string; label: string; example: string }>;
  status: MailingStatus;
  updatedAt: string;
  version: number;
};

export const MAILING_TEMPLATES: MailingTemplate[] = [
  {
    id: "mail-ent-presentation-profil",
    code: "ENT_PRESENTATION_PROFIL",
    name: "Présentation de profil qualifié (Anonymisé)",
    category: "ENTREPRISES",
    targetRole: "ENTREPRISE",
    language: "fr",
    relationalStage: "Proposition de candidat",
    subject: "Recrutement Privé · Proposition de profil qualifié : {{titre_poste}} (Réf. {{ref_candidat}})",
    body: `Bonjour {{nom_contact}},

Dans le cadre de votre besoin de recrutement pour le poste de {{titre_poste}}, nous avons le plaisir de vous présenter la candidature retenue par nos équipes.

Résumé du profil (Réf. {{ref_candidat}}) :
- Métier principal : {{metier_principal}}
- Expérience confirmée : {{annees_experience}} ans
- Compétences clés : {{competences_cles}}
- Adéquation poste : {{score_adequation}}/100

Vous pouvez consulter la fiche détaillée anonymisée directement sur votre espace sécurisé Recrutement Privé :
{{lien_espace_entreprise}}

Nous restons à votre disposition pour organiser un entretien à votre convenance.

Cordialement,
{{nom_consultant}}
Recrutement Privé`,
    variables: [
      { code: "nom_contact", label: "Nom du contact entreprise", example: "Mme Martin" },
      { code: "titre_poste", label: "Intitulé de la mission", example: "Directeur des Jeux" },
      { code: "ref_candidat", label: "Référence anonymisée", example: "RP-2026-88" },
      { code: "metier_principal", label: "Métier du candidat", example: "Exploitation des Jeux" },
      { code: "annees_experience", label: "Années d'expérience", example: "12" },
      { code: "competences_cles", label: "Compétences clés", example: "Blackjack, Audit, Gestion d'équipe" },
      { code: "score_adequation", label: "Score de correspondance", example: "92" },
      { code: "lien_espace_entreprise", label: "Lien espace client", example: "https://recrutement-prive.com/espace/entreprise" },
      { code: "nom_consultant", label: "Nom du consultant référent", example: "Alexandre de Saint-Germain" },
    ],
    status: "APPROUVE",
    updatedAt: "2026-10-12",
    version: 1,
  },
  {
    id: "mail-spo-rapport-activite",
    code: "SPO_RAPPORT_ACTIVITE",
    name: "Rapport d'activité & bilan de parrainage",
    category: "SPONSORS",
    targetRole: "SPONSOR",
    language: "fr",
    relationalStage: "Suivi périodique",
    subject: "Recrutement Privé · Bilan de vos parrainages — {{mois_annee}}",
    body: `Bonjour {{nom_sponsor}},

Nous avons le plaisir de vous transmettre le bilan périodique relatif à vos parrainages au sein du réseau Recrutement Privé.

Synthèse de votre activité :
- Candidats présentés : {{nombre_candidats}}
- Recrutements finalisés : {{nombre_recrutements}}
- Abonnements entreprises actifs : {{nombre_abonnements}}

Votre tableau de bord reste accessible en continu à l'adresse suivante :
{{lien_espace_sponsor}}

Nous vous remercions pour votre confiance continue.

L'équipe Recrutement Privé`,
    variables: [
      { code: "nom_sponsor", label: "Nom du sponsor", example: "M. Laurent" },
      { code: "mois_annee", label: "Mois et année du rapport", example: "Octobre 2026" },
      { code: "nombre_candidats", label: "Nombre de candidats", example: "8" },
      { code: "nombre_recrutements", label: "Recrutements finalisés", example: "2" },
      { code: "nombre_abonnements", label: "Abonnements actifs", example: "3" },
      { code: "lien_espace_sponsor", label: "Lien espace sponsor", example: "https://recrutement-prive.com/espace" },
    ],
    status: "APPROUVE",
    updatedAt: "2026-10-12",
    version: 1,
  },
  {
    id: "mail-col-attribution-dossier",
    code: "COL_ATTRIBUTION_DOSSIER",
    name: "Attribution de dossier / mission de recrutement",
    category: "COLLABORATEURS",
    targetRole: "CONSULTANT",
    language: "fr",
    relationalStage: "Affectation interne",
    subject: "Notification Recrutement Privé · Attribution de la mission {{ref_mission}} — {{nom_entreprise}}",
    body: `Bonjour {{nom_collaborateur}},

L'Owner vous a attribué le suivi opérationnel de la mission suivante :

- Entreprise cliente : {{nom_entreprise}}
- Postes à pourvoir : {{titre_poste}}
- Référence dossier : {{ref_mission}}

Vous pouvez accéder au dossier complet et au vivier de candidats correspondants :
{{lien_dossier_mission}}

Merci de prendre contact avec l'entreprise sous 24 heures ouvrées.

Direction Recrutement Privé`,
    variables: [
      { code: "nom_collaborateur", label: "Nom du consultant / admin", example: "Sophie Valery" },
      { code: "nom_entreprise", label: "Raison sociale entreprise", example: "Casino Grand Cercle" },
      { code: "titre_poste", label: "Poste à pourvoir", example: "Chef de Table" },
      { code: "ref_mission", label: "Référence mission", example: "MIS-2026-44" },
      { code: "lien_dossier_mission", label: "Lien dossier interne", example: "https://recrutement-prive.com/espace/consultant" },
    ],
    status: "APPROUVE",
    updatedAt: "2026-10-12",
    version: 1,
  },
  {
    id: "mail-par-convention-sourcing",
    code: "PAR_CONVENTION_SOURCING",
    name: "Proposition de convention de sourcing institutionnel",
    category: "PARTENAIRES",
    targetRole: "PARTENAIRE",
    language: "fr",
    relationalStage: "Proposition de partenariat",
    subject: "Recrutement Privé · Proposition de partenariat de sourcing : {{nom_etablissement}}",
    body: `Bonjour {{nom_responsable}},

Dans le cadre du développement de nos viviers d'excellence, nous souhaiterions formaliser un partenariat institutionnel avec {{nom_etablissement}}.

Ce partenariat permettra :
- Le référencement prioritaire de vos diplômés / membres qualifiés.
- L'accès sécurisé à nos opportunités auprès de grands groupes et établissements de prestige.
- L'absence garantie de toute revente commerciale de données.

Vous pouvez consulter les détails de notre réseau de partenaires à l'adresse :
{{lien_espace_partenaires}}

Restant à votre écoute pour fixer un échange téléphonique.

Cordialement,
{{nom_representant_rp}}
Recrutement Privé`,
    variables: [
      { code: "nom_responsable", label: "Nom du responsable partenaire", example: "Dr. Dupont" },
      { code: "nom_etablissement", label: "Nom de l'école ou association", example: "École Nationale des Jeux & Métiers" },
      { code: "lien_espace_partenaires", label: "Lien espace partenaires", example: "https://recrutement-prive.com/espace/owner/partenaires" },
      { code: "nom_representant_rp", label: "Représentant Recrutement Privé", example: "Direction des Réseaux" },
    ],
    status: "APPROUVE",
    updatedAt: "2026-10-12",
    version: 1,
  },
];
