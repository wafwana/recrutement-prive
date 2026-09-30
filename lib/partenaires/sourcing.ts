import { createPartner, ActorInfo } from "./partner-service";
import { isRecruitmentPlatform, PartnerStatusCode } from "./taxonomy";

export interface DiscoveredPartner {
  officialName: string;
  usualName?: string;
  category: string;
  subCategory?: string;
  partnerType?: string;
  country?: string;
  region?: string;
  city?: string;
  website?: string;
  institutionalAddress?: string;
  publicContactEmail?: string;
  publicContactPhone?: string;
  languages?: string[];
  sectors?: string[];
  professions?: string[];
  targetAudience?: string[];
  collaborationTypes?: string[];
  potentialNeed?: string;
  source: string;
  sourceUrl?: string;
  discoveredAt: string;
  notes?: string;
}

const CURATED_INSTITUTIONAL_PARTNERS: DiscoveredPartner[] = [
  {
    officialName: "CCI France International",
    usualName: "CCIFI",
    category: "CHAMBRES_COMMERCE",
    subCategory: "CCI_INTERNATIONALE",
    partnerType: "Réseau Consulaire",
    country: "France",
    city: "Paris",
    website: "https://www.ccifrance-international.org",
    publicContactEmail: "contact@ccifrance-international.org",
    languages: ["Français", "Anglais"],
    sectors: ["Commerce International", "Industrie", "Services"],
    targetAudience: ["Entreprises", "Cadres à l'international", "Expatriés"],
    collaborationTypes: ["Relais économique", "Mise en relation", "Événements"],
    source: "ANNUAIRE_OFFICIEL_CCIFI",
    sourceUrl: "https://www.ccifrance-international.org",
    discoveredAt: new Date().toISOString(),
    notes: "Réseau mondial de 119 chambres de commerce françaises à l'étranger dans 94 pays.",
  },
  {
    officialName: "Campus France",
    usualName: "Campus France",
    category: "UNIVERSITES_ECOLES",
    subCategory: "SERVICE_CARRIERE",
    partnerType: "Établissement public",
    country: "France",
    city: "Paris",
    website: "https://www.campusfrance.org",
    publicContactEmail: "info@campusfrance.org",
    languages: ["Français", "Anglais", "Espagnol"],
    sectors: ["Enseignement Supérieur", "Recherche", "Mobilité"],
    targetAudience: ["Étudiants internationaux", "Jeunes diplômés", "Chercheurs"],
    collaborationTypes: ["Mobilité internationale", "Attractivité des talents"],
    source: "INSTITUTIONNEL_ETAT",
    sourceUrl: "https://www.campusfrance.org",
    discoveredAt: new Date().toISOString(),
    notes: "Agence française pour la promotion de l'enseignement supérieur, l'accueil et la mobilité internationale.",
  },
  {
    officialName: "Union des Français de l'Étranger",
    usualName: "UFE",
    category: "RESEAUX_EXPATRIES",
    subCategory: "ASSOCIATION_EXPATRIES",
    partnerType: "Association d'utilité publique",
    country: "France",
    city: "Paris",
    website: "https://www.ufe.org",
    publicContactEmail: "contact@ufe.org",
    languages: ["Français"],
    sectors: ["Accompagnement", "Réseau", "Entraide"],
    targetAudience: ["Expatriés français", "Familles d'expatriés", "Cadres internationaux"],
    collaborationTypes: ["Accueil des talents", "Réseau professionnel de diaspora"],
    source: "RESEAU_EXPAT_MONDE",
    sourceUrl: "https://www.ufe.org",
    discoveredAt: new Date().toISOString(),
    notes: "Association reconnue d'utilité publique regroupant les Français, francophones et francophiles à l'étranger.",
  },
  {
    officialName: "Français du Monde - ADFE",
    usualName: "FDM-ADFE",
    category: "RESEAUX_EXPATRIES",
    subCategory: "ASSOCIATION_EXPATRIES",
    partnerType: "Association Loi 1901",
    country: "France",
    city: "Paris",
    website: "https://www.francais-du-monde.org",
    publicContactEmail: "adfe@francais-du-monde.org",
    languages: ["Français"],
    sectors: ["Solidarité", "Insertion", "Citoyenneté"],
    targetAudience: ["Expatriés", "Travailleurs à l'international"],
    collaborationTypes: ["Relais d'information", "Accompagnement mobilité"],
    source: "RESEAU_EXPAT_MONDE",
    sourceUrl: "https://www.francais-du-monde.org",
    discoveredAt: new Date().toISOString(),
    notes: "Réseau associatif représentatif des citoyens français établis hors de France.",
  },
  {
    officialName: "Conférence des Grandes Écoles",
    usualName: "CGE",
    category: "UNIVERSITES_ECOLES",
    subCategory: "ETABLISSEMENT_SUPERIEUR",
    partnerType: "Association d'écoles",
    country: "France",
    city: "Paris",
    website: "https://www.cge.asso.fr",
    publicContactEmail: "contact@cge.asso.fr",
    languages: ["Français", "Anglais"],
    sectors: ["Ingénierie", "Management", "Grandes Écoles"],
    targetAudience: ["Ingénieurs", "Cadres dirigeants", "Alumni grandes écoles"],
    collaborationTypes: ["Convention d'échange", "Placement diplômés"],
    source: "FEDERATION_ENSEIGNEMENT",
    sourceUrl: "https://www.cge.asso.fr",
    discoveredAt: new Date().toISOString(),
    notes: "Association regroupant plus de 230 grandes écoles d'ingénieurs, de management et de spécialités.",
  },
  {
    officialName: "Réseau France Alumni",
    usualName: "France Alumni",
    category: "UNIVERSITES_ECOLES",
    subCategory: "ALUMNI",
    partnerType: "Plateforme institutionnelle",
    country: "France",
    city: "Paris",
    website: "https://www.francealumni.fr",
    publicContactEmail: "alumni@campusfrance.org",
    languages: ["Français", "Anglais"],
    sectors: ["Tous secteurs", "International"],
    targetAudience: ["Alumni internationaux de l'enseignement supérieur français"],
    collaborationTypes: ["Diffusion réseau", "Événements networking"],
    source: "RESEAU_INSTITUTIONNEL_ALUMNI",
    sourceUrl: "https://www.francealumni.fr",
    discoveredAt: new Date().toISOString(),
    notes: "Réseau officiel des anciens étudiants internationaux ayant effectué leurs études en France.",
  },
];

export async function discoverInstitutionalPartners(query?: {
  category?: string;
  country?: string;
  q?: string;
}): Promise<DiscoveredPartner[]> {
  let results = [...CURATED_INSTITUTIONAL_PARTNERS];

  // Filter out any entries that resemble recruitment platforms or job boards
  results = results.filter((p) => !isRecruitmentPlatform(p.officialName, p.notes, p.website));

  if (query?.category) {
    results = results.filter((p) => p.category === query.category);
  }

  if (query?.country) {
    const term = query.country.toLowerCase();
    results = results.filter((p) => p.country?.toLowerCase().includes(term));
  }

  if (query?.q) {
    const term = query.q.toLowerCase();
    results = results.filter(
      (p) =>
        p.officialName.toLowerCase().includes(term) ||
        p.usualName?.toLowerCase().includes(term) ||
        p.notes?.toLowerCase().includes(term) ||
        p.city?.toLowerCase().includes(term) ||
        p.country?.toLowerCase().includes(term)
    );
  }

  return results;
}

export async function importDiscoveredPartner(
  partner: DiscoveredPartner,
  actor: ActorInfo,
  initialStatus: PartnerStatusCode = "IDENTIFIED"
) {
  if (isRecruitmentPlatform(partner.officialName, partner.notes, partner.website)) {
    throw new Error("EXCLUSION_RECRUITMENT_PLATFORM: Les plateformes de recrutement sont strictement exclues.");
  }

  return createPartner(
    {
      officialName: partner.officialName,
      usualName: partner.usualName,
      category: partner.category,
      subCategory: partner.subCategory,
      partnerType: partner.partnerType,
      status: initialStatus,
      country: partner.country,
      region: partner.region,
      city: partner.city,
      website: partner.website,
      institutionalAddress: partner.institutionalAddress,
      publicContactEmail: partner.publicContactEmail,
      publicContactPhone: partner.publicContactPhone,
      languages: partner.languages,
      sectors: partner.sectors,
      professions: partner.professions,
      targetAudience: partner.targetAudience,
      collaborationTypes: partner.collaborationTypes,
      potentialNeed: partner.potentialNeed,
      notes: partner.notes,
      source: partner.source,
      sourceUrl: partner.sourceUrl,
    },
    actor
  );
}
