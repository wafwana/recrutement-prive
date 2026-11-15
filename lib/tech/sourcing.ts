export type TechNeedKind = "CONFIRMED" | "PUBLIC_OBSERVATION" | "HYPOTHESIS";
export type TechNeedEvidence = { kind: TechNeedKind; category: string; statement: string; sourceUrl: string; observedAt: string };
export type SourcingCandidate = { companyName: string; country: string; website?: string | null; sector?: string | null; companySize?: string | null; publicContact?: string | null; sourceUrl?: string | null; observedAt?: string | null; needs?: TechNeedEvidence[] };
export type TechScore = { total: number; confidence: "LOW" | "MEDIUM" | "HIGH"; factors: Array<{ key: string; label: string; points: number; explanation: string }> };

const LEGAL_SUFFIXES = ["limited liability company","private limited","public limited","société par actions simplifiée","société anonyme","société à responsabilité limitée","llc","ltd","limited","incorporated","inc","corp","corporation","gmbh","sarl","sas","sa","sasu","bv","nv","pty"];

export function normalizeCompanyName(value: string): string {
  const normalized = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
  const words = normalized.split(/\s+/).filter(Boolean);
  while (words.length && LEGAL_SUFFIXES.includes(words.slice(-2).join(" "))) words.splice(-2);
  while (words.length && LEGAL_SUFFIXES.includes(words[words.length - 1])) words.pop();
  return words.join(" ");
}

export function normalizeDomain(value?: string | null): string | null {
  if (!value?.trim()) return null;
  try { const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`); return url.hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, ""); }
  catch { return null; }
}

export function findTechProspectDuplicate(candidate: SourcingCandidate, existing: Array<{ id: string; companyName: string; country?: string | null; website?: string | null; contactEmail?: string | null }>): { id: string; reason: "DOMAIN" | "NAME_COUNTRY" | "PUBLIC_CONTACT" } | null {
  const domain = normalizeDomain(candidate.website), name = normalizeCompanyName(candidate.companyName), country = candidate.country.trim().toLocaleLowerCase(), contact = candidate.publicContact?.trim().toLocaleLowerCase();
  for (const prospect of existing) {
    if (domain && normalizeDomain(prospect.website) === domain) return { id: prospect.id, reason: "DOMAIN" };
    if (name && name === normalizeCompanyName(prospect.companyName) && country && country === (prospect.country || "").trim().toLocaleLowerCase()) return { id: prospect.id, reason: "NAME_COUNTRY" };
    if (contact && contact === (prospect.contactEmail || "").trim().toLocaleLowerCase()) return { id: prospect.id, reason: "PUBLIC_CONTACT" };
  }
  return null;
}

export function classifyTechNeed(input: TechNeedEvidence): TechNeedEvidence {
  if (!input.statement.trim() || !input.category.trim()) throw new Error("Une catégorie et une justification sont obligatoires.");
  const source = new URL(input.sourceUrl);
  if (!["http:", "https:"].includes(source.protocol)) throw new Error("La provenance doit être une URL HTTP(S).");
  if (Number.isNaN(Date.parse(input.observedAt))) throw new Error("La date de collecte est invalide.");
  return { ...input, statement: input.statement.trim(), category: input.category.trim(), sourceUrl: source.toString() };
}

export function scoreTechProspect(candidate: SourcingCandidate, now = new Date()): TechScore {
  const needs = candidate.needs || [], confirmed = needs.filter(n => n.kind === "CONFIRMED").length, observed = needs.filter(n => n.kind === "PUBLIC_OBSERVATION").length, hypotheses = needs.filter(n => n.kind === "HYPOTHESIS").length;
  const validEvidence = needs.filter(n => { try { return Boolean(new URL(n.sourceUrl).hostname) && !Number.isNaN(Date.parse(n.observedAt)); } catch { return false; } }).length;
  const observedAt = candidate.observedAt ? Date.parse(candidate.observedAt) : Number.NaN, ageDays = Number.isFinite(observedAt) ? Math.max(0, (now.getTime() - observedAt) / 86400000) : Infinity;
  const freshness = ageDays <= 30 ? 10 : ageDays <= 90 ? 6 : ageDays <= 180 ? 3 : 0;
  const factors = [
    { key: "service_fit", label: "Adéquation aux prestations", points: candidate.sector ? 15 : 5, explanation: candidate.sector ? "Secteur renseigné ; adéquation à confirmer humainement." : "Secteur non renseigné." },
    { key: "need_signal", label: "Signaux de besoin", points: Math.min(30, confirmed * 15 + observed * 8 + hypotheses * 2), explanation: `${confirmed} besoin(s) confirmé(s), ${observed} observation(s) publique(s), ${hypotheses} hypothèse(s).` },
    { key: "company_potential", label: "Potentiel entreprise", points: candidate.companySize ? 10 : 4, explanation: candidate.companySize ? `Taille renseignée : ${candidate.companySize}.` : "Taille inconnue ; potentiel non établi." },
    { key: "professional_contact", label: "Coordonnée professionnelle publique", points: candidate.publicContact ? 10 : 0, explanation: candidate.publicContact ? "Coordonnée publique référencée ; aucun contact automatique n’est autorisé." : "Aucune coordonnée publique référencée." },
    { key: "data_quality", label: "Qualité des preuves", points: Math.min(15, validEvidence * 5), explanation: `${validEvidence} preuve(s) avec URL et date exploitables.` },
    { key: "freshness", label: "Fraîcheur des données", points: freshness, explanation: Number.isFinite(ageDays) ? `Collecte il y a environ ${Math.floor(ageDays)} jour(s).` : "Date de collecte absente ou invalide." },
  ];
  const total = Math.min(100, factors.reduce((sum, factor) => sum + factor.points, 0));
  const confidence = validEvidence >= 2 && confirmed + observed >= 2 ? "HIGH" : validEvidence >= 1 && confirmed + observed + hypotheses >= 1 ? "MEDIUM" : "LOW";
  return { total, confidence, factors };
}
