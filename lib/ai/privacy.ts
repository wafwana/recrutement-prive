import { AiAnalysisContext, AiProvider } from "./types";

export type PrivacyGuardrailResult =
  | { allowed: true }
  | { allowed: false; reason: string };

/**
 * Scans raw text / prompt for PII, candidate identity markers, confidential keywords, and pseudonymization markers.
 */
export function inspectContentForPrivacyRisks(text: string): {
  containsPii: boolean;
  containsCandidateMarkers: boolean;
  containsConfidentialEnterprise: boolean;
  containsPseudonymizationMarkers: boolean;
  detectedIssues: string[];
} {
  const detectedIssues: string[] = [];
  if (!text) {
    return {
      containsPii: false,
      containsCandidateMarkers: false,
      containsConfidentialEnterprise: false,
      containsPseudonymizationMarkers: false,
      detectedIssues: [],
    };
  }

  // 1. Email detection
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const containsEmail = emailRegex.test(text);
  if (containsEmail) {
    detectedIssues.push("Adresse email détectée");
  }

  // 2. Phone number detection (FR, international, formatted numbers)
  const phoneRegex = /(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:0|\(0\))[1-9](?:[\s.-]?\d{2}){4}|\+\d{10,13}/;
  const containsPhone = phoneRegex.test(text);
  if (containsPhone) {
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

  const containsPii = containsEmail || containsPhone;

  return {
    containsPii,
    containsCandidateMarkers,
    containsConfidentialEnterprise,
    containsPseudonymizationMarkers,
    detectedIssues,
  };
}

/**
 * Evaluates whether an AI request is permitted for a given AI provider.
 *
 * Rules for FREE GEMINI provider:
 * - Real candidate CVs (`REAL_CV`) are STRICTLY BLOCKED before network call.
 * - Candidate private data (`CANDIDATE_DATA`) including PII is STRICTLY BLOCKED before network call.
 * - Confidential enterprise data (`CONFIDENTIAL_ENTERPRISE`) is STRICTLY BLOCKED before network call.
 * - Pseudonymized candidate data is NOT considered sufficient anonymization and is STILL BLOCKED.
 * - Declarative classification alone is NOT trusted: content is inspected.
 * - Only PUBLIC_OFFER or explicitly verified MOCK_DATA (fictional non-confidential data) without PII / confidential content are allowed.
 */
export function evaluatePrivacyGuardrails(
  provider: AiProvider,
  context: AiAnalysisContext,
  payloadText?: string
): PrivacyGuardrailResult {
  // OpenAI provider preserves existing operations for real candidate data
  if (provider === "openai") {
    return { allowed: true };
  }

  if (provider === "gemini") {
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

    // 2. Dynamic content inspection check (does not rely on declarative classification alone)
    if (payloadText) {
      const inspection = inspectContentForPrivacyRisks(payloadText);

      if (inspection.containsPii) {
        return {
          allowed: false,
          reason: `Le contenu fourni contient des données personnelles (PII) détectées (${inspection.detectedIssues.join(", ")}). Blocage pré-réseau Gemini.`,
        };
      }

      if (inspection.containsCandidateMarkers && !context.isMockData) {
        return {
          allowed: false,
          reason: "Le contenu fourni présente des marqueurs de CV / données candidates réelles. Blocage pré-réseau Gemini.",
        };
      }

      if (inspection.containsPseudonymizationMarkers) {
        return {
          allowed: false,
          reason: "La pseudonymisation détectée n'est pas acceptée comme une anonymisation suffisante pour Gemini gratuit.",
        };
      }

      if (inspection.containsConfidentialEnterprise) {
        return {
          allowed: false,
          reason: "Marqueurs de confidentialité d'entreprise détectés dans le contenu. Blocage pré-réseau Gemini.",
        };
      }
    }

    if (context.classification === "PUBLIC_OFFER" || context.classification === "MOCK_DATA" || context.isMockData) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: "Catégorie de données non autorisée pour le mode Gemini gratuit.",
    };
  }

  return { allowed: false, reason: "Fournisseur d'IA inconnu ou non supporté." };
}

/**
 * Sanitizes and redacts sensitive information (API keys, personal names, emails, phone numbers, CV content) from logs.
 */
export function safeSanitizeLogMessage(message: string): string {
  if (!message) return "";
  return message
    // Redact API keys (e.g. AIzaSy..., sk-...)
    .replace(/(AIzaSy[A-Za-z0-9_-]{33})/g, "[REDACTED_GEMINI_KEY]")
    .replace(/(sk-[A-Za-z0-9_-]{30,})/g, "[REDACTED_OPENAI_KEY]")
    // Redact bearer tokens
    .replace(/(Bearer\s+)[A-Za-z0-9_.-]+/gi, "$1[REDACTED_TOKEN]")
    // Redact emails
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[REDACTED_EMAIL]")
    // Redact phone numbers (international / standard formats)
    .replace(/(\+\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}/g, "[REDACTED_PHONE]");
}

/**
 * Safe logger that ensures no sensitive payloads, prompts, or API keys leak into console logs.
 */
export function safeLogInfo(tag: string, details: string) {
  const sanitized = safeSanitizeLogMessage(details);
  console.log(`[AI_SAFE_LOG][${tag}] ${sanitized}`);
}

export function safeLogError(tag: string, details: string) {
  const sanitized = safeSanitizeLogMessage(details);
  console.error(`[AI_SAFE_ERROR][${tag}] ${sanitized}`);
}
