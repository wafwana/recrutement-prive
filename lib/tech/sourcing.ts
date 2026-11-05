/**
 * Moteur de Détection & Qualification Sourcing International — Pôle 2
 * Permet d'identifier, qualifier et organiser les entreprises ayant un besoin
 * de plateformes web, applications ou outils métiers sur mesure.
 */

export type CommercialSignal =
  | "CREATION_RECENTE"
  | "CROISSANCE_EXPANSION"
  | "DEVELOPPEMENT_INTERNATIONAL"
  | "NOUVEAU_SERVICE"
  | "TRANSFORMATION_NUMERIQUE"
  | "APPEL_OFFRE_PRESTATAIRE"
  | "OUTIL_OBSOLETE_DETECTE";

export type DetectedCompany = {
  companyName: string;
  siren?: string | null;
  siret?: string | null;
  country: string;
  city?: string | null;
  sector: string;
  website?: string | null;
  detectionSource: string;
  sourceUrl?: string | null;
  collectedAt: string;
  signals: CommercialSignal[];
  potentialTechNeed: string;
  publicContactEmail?: string | null;
  estimatedBudgetRange?: string | null;
};

export type QualificationResult = {
  score: number; // 0 à 100
  qualificationLevel: "FAIBLE" | "MOYEN" | "FORT" | "PRIORITAIRE";
  criteriaDetails: {
    criterion: string;
    weight: number;
    pointsAwarded: number;
    explanation: string;
  }[];
  recommendations: string[];
};

export function calculateQualificationScore(
  signals: CommercialSignal[],
  company: {
    sector: string;
    country: string;
    website?: string | null;
  }
): QualificationResult {
  const criteria: QualificationResult["criteriaDetails"] = [];
  let totalPoints = 0;

  // 1. Signaux de besoin technologique
  if (signals.includes("APPEL_OFFRE_PRESTATAIRE") || signals.includes("OUTIL_OBSOLETE_DETECTE")) {
    criteria.push({
      criterion: "Besoin numérique explicite ou obsolescence identifiée",
      weight: 35,
      pointsAwarded: 35,
      explanation: "L'entreprise recherche activement un prestataire ou dispose d'un site à refondre.",
    });
    totalPoints += 35;
  } else if (signals.includes("TRANSFORMATION_NUMERIQUE") || signals.includes("NOUVEAU_SERVICE")) {
    criteria.push({
      criterion: "Transformation numérique / Nouveau service",
      weight: 25,
      pointsAwarded: 25,
      explanation: "Lancement d'une nouvelle offre exigeant un portail web ou une interface dédiée.",
    });
    totalPoints += 25;
  } else {
    criteria.push({
      criterion: "Signal de veille générale",
      weight: 10,
      pointsAwarded: 10,
      explanation: "Activité détectée sans expression de besoin immédiate.",
    });
    totalPoints += 10;
  }

  // 2. Dynamique de croissance
  if (signals.includes("CROISSANCE_EXPANSION") || signals.includes("DEVELOPPEMENT_INTERNATIONAL")) {
    criteria.push({
      criterion: "Expansion ou déploiement international",
      weight: 30,
      pointsAwarded: 30,
      explanation: "Développement multi-pays nécessitant des outils collaboratifs ou bilingues.",
    });
    totalPoints += 30;
  } else if (signals.includes("CREATION_RECENTE")) {
    criteria.push({
      criterion: "Lancement d'activité",
      weight: 20,
      pointsAwarded: 20,
      explanation: "Besoin initial d'une plateforme socle ou MVP.",
    });
    totalPoints += 20;
  }

  // 3. Présence d'un domaine ou site officiel
  if (company.website && company.website.includes(".")) {
    criteria.push({
      criterion: "Domaine et site officiel identifié",
      weight: 20,
      pointsAwarded: 20,
      explanation: "Entreprise disposant d'un canal numérique établi vérifiable.",
    });
    totalPoints += 20;
  } else {
    criteria.push({
      criterion: "Absence de site internet officiel",
      weight: 15,
      pointsAwarded: 15,
      explanation: "Opportunité de création complète de premier site professionnel.",
    });
    totalPoints += 15;
  }

  // 4. Secteur porteur
  const highPotentialSectors = ["TECH", "FINANCE", "HOTELLERIE", "COMMERCE", "SANTE", "INDUSTRIE"];
  const isHighPotential = highPotentialSectors.some((s) =>
    company.sector.toUpperCase().includes(s)
  );

  if (isHighPotential) {
    criteria.push({
      criterion: "Secteur à forte valeur ajoutée numérique",
      weight: 15,
      pointsAwarded: 15,
      explanation: "Secteur d'activité avec des marges et des budgets technologiques élevés.",
    });
    totalPoints += 15;
  } else {
    criteria.push({
      criterion: "Secteur standard",
      weight: 5,
      pointsAwarded: 5,
      explanation: "Secteur conventionnel.",
    });
    totalPoints += 5;
  }

  const score = Math.min(100, totalPoints);
  let qualificationLevel: QualificationResult["qualificationLevel"] = "FAIBLE";
  if (score >= 80) qualificationLevel = "PRIORITAIRE";
  else if (score >= 60) qualificationLevel = "FORT";
  else if (score >= 40) qualificationLevel = "MOYEN";

  const recommendations: string[] = [];
  if (qualificationLevel === "PRIORITAIRE") {
    recommendations.push("Prendre contact sous 48h pour proposer un échange de cadrage.");
  } else if (qualificationLevel === "FORT") {
    recommendations.push("Enrichir la fiche avec les décideurs avant premier contact.");
  } else {
    recommendations.push("Mettre en veille et suivre les prochaines annonces publiques.");
  }

  return {
    score,
    qualificationLevel,
    criteriaDetails: criteria,
    recommendations,
  };
}

/**
 * Détection des doublons :
 * Évite les saisies redondantes par comparaison SIREN/SIRET ou combinaison domaine web + pays.
 */
export function detectDuplicateProspect(
  existingProspects: {
    siren?: string | null;
    siret?: string | null;
    website?: string | null;
    country?: string | null;
  }[],
  newCompany: {
    siren?: string | null;
    siret?: string | null;
    website?: string | null;
    country?: string | null;
  }
): boolean {
  // 1. Dédoublonnage par SIRET ou SIREN exact
  if (newCompany.siret) {
    const cleanSiret = newCompany.siret.replace(/\s+/g, "");
    if (existingProspects.some((p) => p.siret && p.siret.replace(/\s+/g, "") === cleanSiret)) {
      return true;
    }
  }

  if (newCompany.siren) {
    const cleanSiren = newCompany.siren.replace(/\s+/g, "");
    if (existingProspects.some((p) => p.siren && p.siren.replace(/\s+/g, "") === cleanSiren)) {
      return true;
    }
  }

  // 2. Dédoublonnage par Domaine web normalisé et Pays
  if (newCompany.website && newCompany.country) {
    const normalizeDomain = (url: string) =>
      url
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .split("/")[0]
        .trim();

    const targetDomain = normalizeDomain(newCompany.website);
    if (targetDomain.length > 3) {
      const match = existingProspects.some(
        (p) =>
          p.website &&
          normalizeDomain(p.website) === targetDomain &&
          p.country?.toLowerCase() === newCompany.country?.toLowerCase()
      );
      if (match) return true;
    }
  }

  return false;
}
