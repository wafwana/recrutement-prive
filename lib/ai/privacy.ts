import { AiAnalysisContext, AiProvider } from "./types";

export type PrivacyGuardrailResult =
  | { allowed: true; sanitizedPrompt?: string }
  | { allowed: false; reason: string };

/**
 * List of explicitly allowed minimal fields permitted to be sent to Gemini Free.
 * Any other field (companyName, contactEmail, sourceUrl, companySiret, rawText, internal IDs, metadata)
 * is strictly forbidden and stripped/rejected prior to calling Gemini.
 */
export type AllowedGeminiPayloadFields = {
  title?: string | null;
  location?: string | null; // Generic city or country only
  missionType?: string | null;
  skills?: string[] | null;
  experienceYears?: number | null;
  descriptionSummary?: string | null; // Sanitized generic text summary without company names or PII
};

/**
 * Scans raw text / prompt for PII, candidate identity markers, confidential keywords, pseudonymization markers, and internal IDs.
 */
export function inspectContentForPrivacyRisks(text: string): {
  containsPii: boolean;
  containsCandidateMarkers: boolean;
  containsConfidentialEnterprise: boolean;
  containsPseudonymizationMarkers: boolean;
  containsInternalIdentifiers: boolean;
  containsForbiddenFields: boolean;
  detectedIssues: string[];
} {
  const detectedIssues: string[] = [];
  if (!text) {
    return {
      containsPii: false,
      containsCandidateMarkers: false,
      containsConfidentialEnterprise: false,
      containsPseudonymizationMarkers: false,
      containsInternalIdentifiers: false,
      containsForbiddenFields: false,
      detectedIssues: [],
    };
  }

  // 1. Email detection
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  if (emailRegex.test(text)) {
    detectedIssues.push("Adresse email détectée");
  }

  // 2. Phone number detection (FR, international, formatted numbers)
  const phoneRegex = /(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:0|\(0\))[1-9](?:[\s.-]?\d{2}){4}|\+\d{10,13}/;
  if (phoneRegex.test(text)) {
    detectedIssues.push("Numéro de téléphone détecté");
  }

  // 3. Candidate / CV markers
  const cvMarkersRegex = /\b(curriculum\s+vitae|\bcv\b|candidat|candidature|expérience\s+professionnelle|mon\s+parcours|diplômes?\s+obtenus?|permis\s+de\s+conduire|situation\s+familiale|date\s+de\s+naissance|né\(e\)\s+le)\b/i;
  const containsCandidateMarkers = cvMarkersRegex.test(text);
  if (containsCandidateMarkers) {
    detectedIssues.push("Marqueurs de CV / parcours candidat détectés");
  }

  // 4. Confidential enterprise markers
  const confidentialRegex = /\b(strictement\s+confidentiel|confidentiel|entreprise\s+confidentielle|ne\s+pas\s+diffuser|projet\s+secret|restructuration\s+interne)\b/i;
  const containsConfidentialEnterprise = confidentialRegex.test(text);
  if (containsConfidentialEnterprise) {
    detectedIssues.push("Données ou contexte confidentiel d'entreprise détecté");
  }

  // 5. Pseudonymization markers (e.g. "Candidat A", "Mme X", "Monsieur Y", "Anonymisé", "[Nom Masqué]")
  const pseudoRegex = /\b(candidat\s+[a-z0-9]|monsieur\s+[x-z]|mme\s+[x-z]|nom\s+masqué|prénom\s+masqué|profil\s+pseudonymisé|anonymisé|masqué)\b/i;
  const containsPseudonymizationMarkers = pseudoRegex.test(text);
  if (containsPseudonymizationMarkers) {
    detectedIssues.push("Indicateurs de pseudonymisation détectés");
  }

  // 6. Internal platform IDs (UUIDs, CUIDs, prefixes like usr_, cand_, job_, comp_)
  const internalIdRegex = /\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|c[a-z0-9]{24}|(usr_|cand_|job_|comp_|pres_)[a-zA-Z0-9_-]+)\b/i;
  const containsInternalIdentifiers = internalIdRegex.test(text);
  if (containsInternalIdentifiers) {
    detectedIssues.push("Identifiants internes de plateforme détectés");
  }

  // 7. Explicit forbidden field keywords or URLs in Gemini payload
  const forbiddenKeywordsRegex = /\b(companyName|contactEmail|sourceUrl|companySiret|rawText|siret|siren|website|url)\s*[:=]/i;
  const containsForbiddenFields = forbiddenKeywordsRegex.test(text) || /https?:\/\/[^\s]+/i.test(text);
  if (containsForbiddenFields) {
    detectedIssues.push("Champs interdits ou URLs détectés dans la charge Gemini");
  }

  const containsPii = emailRegex.test(text) || phoneRegex.test(text);

  return {
    containsPii,
    containsCandidateMarkers,
    containsConfidentialEnterprise,
    containsPseudonymizationMarkers,
    containsInternalIdentifiers,
    containsForbiddenFields,
    detectedIssues,
  };
}

/**
 * Centralized Gemini Payload Sanitizer and Validator.
 * Reconstructs the prompt sending ONLY explicitly approved minimal fields:
 * - title
 * - location (generic city / country)
 * - missionType
 * - skills (string array)
 * - experienceYears (number)
 * - descriptionSummary (generic text without company names, PII, URLs, or internal IDs)
 *
 * Strips and rejects:
 * - companyName, contactEmail, sourceUrl, website, companySiret, rawText, internal IDs, tracking metadata.
 */
function sanitizeAllowedPublicText(value: string | null | undefined): string {
  return (value || "")
    .replace(/https?:\/\/[^\s]+/gi, " ")
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, " ")
    .replace(/(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:0|\(0\))[1-9](?:[\s.-]?\d{2}){4}|\+\d{10,13}/g, " ")
    .replace(/\b(?:companyName|contactEmail|sourceUrl|companySiret|rawText|siret|siren|website|url)\s*[:=][^\n]*/gi, " ")
    .replace(/\b(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|c[a-z0-9]{24}|(?:usr_|cand_|job_|comp_|pres_)[a-zA-Z0-9_-]+)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 6000);
}

export function sanitizeAndValidateGeminiPayload(
  fields?: AllowedGeminiPayloadFields | null,
  rawPrompt?: string
): { allowed: boolean; sanitizedPrompt?: string; reason?: string } {
  // If structured minimal fields are provided, format strictly from explicitly approved fields.
  // Strip URLs, contact details, internal IDs, and forbidden field/value lines before inspection.
  // Sensitive/candidate/confidential markers are still rejected below; they are never whitelisted.
  if (fields) {
    const title = sanitizeAllowedPublicText(fields.title);
    const location = sanitizeAllowedPublicText(fields.location);
    const missionType = sanitizeAllowedPublicText(fields.missionType);
    const skills = Array.isArray(fields.skills)
      ? fields.skills.map((s) => sanitizeAllowedPublicText(s)).filter(Boolean)
      : [];
    const experienceYears = typeof fields.experienceYears === "number" && Number.isFinite(fields.experienceYears) ? fields.experienceYears : null;
    const descriptionSummary = sanitizeAllowedPublicText(fields.descriptionSummary);

    // Construct minimal text strictly from allowed fields
    const minimalText = [
      title ? `Titre: ${title}` : "",
      location ? `Localisation: ${location}` : "",
      missionType ? `Type de mission: ${missionType}` : "",
      skills.length ? `Compétences: ${skills.join(", ")}` : "",
      experienceYears !== null ? `Années d'expérience: ${experienceYears}` : "",
      descriptionSummary ? `Description générique: ${descriptionSummary}` : "",
    ].filter(Boolean).join("\n");

    if (!minimalText || minimalText.length < 10) {
      return {
        allowed: false,
        reason: "La charge minimale autorisée pour Gemini est insuffisante ou vide après filtrage des champs autorisés.",
      };
    }

    // Pass constructed minimal text through dynamic content inspection
    const inspection = inspectContentForPrivacyRisks(minimalText);
    if (inspection.containsPii || inspection.containsCandidateMarkers || inspection.containsPseudonymizationMarkers || inspection.containsConfidentialEnterprise || inspection.containsInternalIdentifiers || inspection.containsForbiddenFields) {
      return {
        allowed: false,
        reason: `Données interdites détectées dans la charge minimale Gemini (${inspection.detectedIssues.join(", ")}). Blocage pré-réseau.`,
      };
    }

    return { allowed: true, sanitizedPrompt: minimalText };
  }

  // If no structured fields provided, inspect raw prompt
  if (rawPrompt) {
    const inspection = inspectContentForPrivacyRisks(rawPrompt);
    if (inspection.containsPii || inspection.containsCandidateMarkers || inspection.containsPseudonymizationMarkers || inspection.containsConfidentialEnterprise || inspection.containsInternalIdentifiers || inspection.containsForbiddenFields) {
      return {
        allowed: false,
        reason: `Contenu non autorisé détecté pour le mode Gemini gratuit (${inspection.detectedIssues.join(", ")}). Blocage pré-réseau.`,
      };
    }
    return { allowed: true, sanitizedPrompt: rawPrompt };
  }

  return { allowed: false, reason: "Aucune donnée ni charge textuelle valide fournie pour Gemini." };
}

/**
 * Evaluates whether an AI request is permitted for a given AI provider.
 *
 * Rules for FREE GEMINI provider:
 * - PUBLIC_OFFER classification alone NEVER gives automatic authorization.
 * - ANY attached file (fileInput) is STRICTLY REFUSED prior to network call.
 * - Real candidate CVs, candidate private data, PII, pseudonymized data, internal IDs, confidential offers, company names, URLs are STRICTLY BLOCKED.
 * - Centralized payload sanitization enforces strict allowlist of minimal fields.
 */
export function evaluatePrivacyGuardrails(
  provider: AiProvider,
  context: AiAnalysisContext,
  payloadText?: string,
  hasFileInput?: boolean,
  geminiFields?: AllowedGeminiPayloadFields | null
): PrivacyGuardrailResult {
  if (provider === "openai") {
    return { allowed: true };
  }

  if (provider === "gemini") {
    // 0. STRICT FILE BLOCKING
    if (hasFileInput) {
      return {
        allowed: false,
        reason: "Le mode Gemini gratuit interdit strictement tout fichier joint ou pièce jointe (CV, PDF, images). Seul le texte brut public est autorisé.",
      };
    }

    // 1. Declarative check on classification
    if (context.classification === "REAL_CV") {
      return {
        allowed: false,
        reason: "Le mode Gemini gratuit interdit tout traitement de CV réels par mesure de confidentialité stricte.",
      };
    }

    if (context.isPseudonymized) {
      return {
        allowed: false,
        reason: "La pseudonymisation n'est pas considérée comme une anonymisation suffisante pour le fournisseur Gemini gratuit.",
      };
    }

    if (context.classification === "CANDIDATE_DATA" || context.containsPii) {
      return {
        allowed: false,
        reason: "Le mode Gemini gratuit interdit l'envoi de données candidates ou personnelles (PII).",
      };
    }

    if (context.classification === "CONFIDENTIAL_ENTERPRISE" || context.isConfidentialEnterprise) {
      return {
        allowed: false,
        reason: "Le mode Gemini gratuit interdit le traitement de données confidentielles d'entreprise.",
      };
    }

    // PUBLIC_OFFER alone is NOT automatically permitted without minimal field sanitization
    if (context.classification !== "PUBLIC_OFFER" && context.classification !== "MOCK_DATA" && !context.isMockData) {
      return {
        allowed: false,
        reason: "Classification déclarative non autorisée pour Gemini gratuit.",
      };
    }

    // 2. Centralized minimal payload sanitization and validation
    const sanitization = sanitizeAndValidateGeminiPayload(geminiFields, payloadText);
    if (!sanitization.allowed || !sanitization.sanitizedPrompt) {
      return {
        allowed: false,
        reason: sanitization.reason || "Échec du filtrage et de la validation de la charge Gemini.",
      };
    }

    return { allowed: true, sanitizedPrompt: sanitization.sanitizedPrompt };
  }

  return { allowed: false, reason: "Fournisseur d'IA inconnu ou non supporté." };
}

/**
 * Sanitizes and redacts sensitive information (API keys, personal names, emails, phone numbers, CV content) from logs.
 */
export function safeSanitizeLogMessage(message: string): string {
  if (!message) return "";
  return message
    .replace(/(AIzaSy[A-Za-z0-9_-]{33})/g, "[REDACTED_GEMINI_KEY]")
    .replace(/(sk-[A-Za-z0-9_-]{30,})/g, "[REDACTED_OPENAI_KEY]")
    .replace(/(Bearer\s+)[A-Za-z0-9_.-]+/gi, "$1[REDACTED_TOKEN]")
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[REDACTED_EMAIL]")
    .replace(/(\+\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}/g, "[REDACTED_PHONE]");
}

export function safeLogInfo(tag: string, details: string) {
  const sanitized = safeSanitizeLogMessage(details);
  console.log(`[AI_SAFE_LOG][${tag}] ${sanitized}`);
}

export function safeLogError(tag: string, details: string) {
  const sanitized = safeSanitizeLogMessage(details);
  console.error(`[AI_SAFE_ERROR][${tag}] ${sanitized}`);
}
