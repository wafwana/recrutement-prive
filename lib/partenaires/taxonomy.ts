export interface PartnerSubcategory {
  code: string;
  label: string;
  description?: string;
}

export interface PartnerCategory {
  code: string;
  label: string;
  description: string;
  subcategories: PartnerSubcategory[];
}

export const PARTNER_CATEGORIES: PartnerCategory[] = [
  {
    code: "UNIVERSITES_ECOLES",
    label: "Universités / Écoles / Formation",
    description: "Établissements d'enseignement supérieur, grandes écoles, centres de formation et réseaux d'alumni.",
    subcategories: [
      { code: "UNIVERSITE", label: "Universités" },
      { code: "ETABLISSEMENT_SUPERIEUR", label: "Établissements supérieurs" },
      { code: "ECOLE_INGENIEUR", label: "Écoles d'ingénieurs" },
      { code: "ECOLE_SPECIALISEE", label: "Écoles spécialisées" },
      { code: "FORMATION_PROFESSIONNELLE", label: "Formation professionnelle" },
      { code: "CENTRE_FORMATION", label: "Centres de formation" },
      { code: "CERTIFICATION", label: "Certification" },
      { code: "SERVICE_CARRIERE", label: "Services carrières" },
      { code: "RELATION_ENTREPRISE", label: "Relations entreprises" },
      { code: "ALUMNI", label: "Alumni" },
    ],
  },
  {
    code: "CHAMBRES_COMMERCE",
    label: "Chambres de commerce / Réseaux économiques",
    description: "Chambres de commerce et d'industrie, réseaux territoriaux et associations professionnelles.",
    subcategories: [
      { code: "CCI_FRANCAISE", label: "CCI françaises" },
      { code: "CCI_INTERNATIONALE", label: "CCI internationales" },
      { code: "CHAMBRE_BILATERALE", label: "Chambres bilatérales" },
      { code: "RESEAU_ECONOMIQUE_TERRITORIAL", label: "Réseaux économiques territoriaux" },
      { code: "ASSOCIATION_PROFESSIONNELLE", label: "Associations professionnelles" },
      { code: "RESEAU_ENTREPRISE", label: "Réseaux d'entreprises" },
      { code: "ACCOMPAGNEMENT_INTERNATIONAL", label: "Organismes d'accompagnement international" },
    ],
  },
  {
    code: "ONG_ASSOCIATIONS",
    label: "ONG / Associations",
    description: "Organisations non gouvernementales, associations d'insertion et d'accompagnement de talents.",
    subcategories: [
      { code: "ONG", label: "ONG" },
      { code: "ASSOCIATION_PROFESSIONNELLE", label: "Associations professionnelles" },
      { code: "INSERTION", label: "Insertion" },
      { code: "FORMATION_ASSOCIATIVE", label: "Formation" },
      { code: "EMPLOI_ASSOCIATIF", label: "Emploi" },
      { code: "MOBILITE_PROFESSIONNELLE", label: "Mobilité professionnelle" },
      { code: "ACCOMPAGNEMENT_TALENTS", label: "Accompagnement des talents" },
    ],
  },
  {
    code: "RESEAUX_EXPATRIES",
    label: "Réseaux d'expatriés",
    description: "Communautés internationales, réseaux de diasporas et relais institutionnels à l'étranger.",
    subcategories: [
      { code: "ASSOCIATION_EXPATRIES", label: "Associations d'expatriés" },
      { code: "COMMUNAUTE_INTERNATIONALE", label: "Communautés internationales" },
      { code: "DIASPORA_PROFESSIONNELLE", label: "Réseaux professionnels de diaspora" },
      { code: "ALUMNI_INTERNATIONAUX", label: "Réseaux d'anciens élèves internationaux" },
      { code: "ASSOCIATION_LOCALE", label: "Associations locales" },
      { code: "RELAIS_INSTITUTIONNEL", label: "Relais institutionnels" },
      { code: "RELAIS_ECONOMIQUE", label: "Relais économiques" },
    ],
  },
  {
    code: "AUTRES_PARTENAIRES",
    label: "Autres partenaires admissibles",
    description: "Autres organismes et partenaires institutionnels qualifiés.",
    subcategories: [
      { code: "FONDATION", label: "Fondations" },
      { code: "INSTITUT_RECHERCHE", label: "Instituts de recherche" },
      { code: "CLUB_AFFAIRES", label: "Clubs d'affaires" },
      { code: "AUTRE", label: "Autre organisme" },
    ],
  },
];

export const PARTNER_STATUSES = [
  { code: "IDENTIFIED", label: "Identifié" },
  { code: "TO_QUALIFY", label: "À qualifier" },
  { code: "PROSPECT", label: "Prospect" },
  { code: "FIRST_CONTACT_MADE", label: "Premier contact effectué" },
  { code: "IN_DISCUSSION", label: "Échange en cours" },
  { code: "AGREEMENT_IN_PREPARATION", label: "Accord en préparation" },
  { code: "VALIDATED_PARTNER", label: "Partenaire validé" },
  { code: "INACTIVE", label: "Inactif" },
  { code: "ARCHIVED", label: "Archivé" },
] as const;

export type PartnerStatusCode = (typeof PARTNER_STATUSES)[number]["code"];

export const AGREEMENT_TYPES = [
  { code: "CONVENTION_PARTENARIAT", label: "Convention de partenariat" },
  { code: "ACCORD_DIFFUSION", label: "Accord de diffusion" },
  { code: "CHARTE_RESEAU", label: "Charte réseau" },
  { code: "ACCORD_ECOLE_UNIVERSITE", label: "Accord école / université" },
  { code: "ACCORD_MOBILITE_INTERNATIONALE", label: "Accord de mobilité internationale" },
  { code: "ACCORD_CADRE", label: "Accord-cadre" },
  { code: "AUTRE", label: "Autre accord" },
] as const;

export type AgreementTypeCode = (typeof AGREEMENT_TYPES)[number]["code"];

export const AGREEMENT_STATUSES = [
  { code: "PROJECT", label: "En projet" },
  { code: "IN_NEGOTIATION", label: "En négociation" },
  { code: "SIGNED", label: "Signé" },
  { code: "ACTIVE", label: "Actif" },
  { code: "EXPIRED", label: "Expiré" },
  { code: "TERMINATED", label: "Résilié" },
] as const;

export type AgreementStatusCode = (typeof AGREEMENT_STATUSES)[number]["code"];

export const PARTNER_PRIORITIES = [
  { code: "LOW", label: "Basse" },
  { code: "MEDIUM", label: "Moyenne" },
  { code: "HIGH", label: "Haute" },
  { code: "CRITICAL", label: "Critique" },
] as const;

// Strict exclusion keywords for recruitment platforms / commercial agencies
const RECRUITMENT_PLATFORM_KEYWORDS = [
  "cabinet de recrutement",
  "cabinet de chasse",
  "chasseur de têtes",
  "chasseur de tetes",
  "jobboard",
  "job board",
  "cvthèque",
  "cv-thèque",
  "cvthque",
  "cv library",
  "cv database",
  "banque de cv",
  "agence d'intérim",
  "intérim",
  "recruitment agency",
  "staffing agency",
  "headhunting",
  "vendeur de cv",
  "plateforme de recrutement",
  "fournisseur de candidats",
  "sourcing commercial",
];

export function isRecruitmentPlatform(name: string, description?: string | null, website?: string | null): boolean {
  const textToTest = `${name} ${description || ""} ${website || ""}`.toLowerCase();
  return RECRUITMENT_PLATFORM_KEYWORDS.some((keyword) => textToTest.includes(keyword));
}

export function getCategoryLabel(categoryCode: string): string {
  const cat = PARTNER_CATEGORIES.find((c) => c.code === categoryCode);
  return cat ? cat.label : categoryCode;
}

export function getSubcategoryLabel(categoryCode: string, subcategoryCode?: string | null): string {
  if (!subcategoryCode) return "—";
  const cat = PARTNER_CATEGORIES.find((c) => c.code === categoryCode);
  if (!cat) return subcategoryCode;
  const sub = cat.subcategories.find((s) => s.code === subcategoryCode);
  return sub ? sub.label : subcategoryCode;
}

export function getStatusLabel(statusCode: string): string {
  const status = PARTNER_STATUSES.find((s) => s.code === statusCode);
  return status ? status.label : statusCode;
}

export function getAgreementTypeLabel(typeCode: string): string {
  const type = AGREEMENT_TYPES.find((t) => t.code === typeCode);
  return type ? type.label : typeCode;
}

export function getAgreementStatusLabel(statusCode: string): string {
  const status = AGREEMENT_STATUSES.find((s) => s.code === statusCode);
  return status ? status.label : statusCode;
}
