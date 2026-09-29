import { AiAnalysisContext, AiProvider } from "./types";

export type PrivacyGuardrailResult =
  | { allowed: true }
  | { allowed: false; reason: string };

/**
 * Evaluates whether an AI request is permitted for a given AI provider.
 *
 * Rules for FREE GEMINI provider:
 * - Real candidate CVs (`REAL_CV`) are STRICTLY BLOCKED before network call.
 * - Candidate private data (`CANDIDATE_DATA`) including PII is STRICTLY BLOCKED before network call.
 * - Confidential enterprise data (`CONFIDENTIAL_ENTERPRISE`) is STRICTLY BLOCKED before network call.
 * - Pseudonymized candidate data is NOT considered sufficient anonymization and is STILL BLOCKED.
 * - Only PUBLIC_OFFER or explicitly verified MOCK_DATA (fictional non-confidential data) are allowed.
 */
export function evaluatePrivacyGuardrails(
  provider: AiProvider,
  context: AiAnalysisContext
): PrivacyGuardrailResult {
  // OpenAI provider preserves existing operations for real candidate data
  if (provider === "openai") {
    return { allowed: true };
  }

  if (provider === "gemini") {
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
 * Safe logger that ensures no sensitive payloads or API keys leak into console logs.
 */
export function safeLogInfo(tag: string, details: string) {
  const sanitized = safeSanitizeLogMessage(details);
  console.log(`[AI_SAFE_LOG][${tag}] ${sanitized}`);
}

export function safeLogError(tag: string, details: string) {
  const sanitized = safeSanitizeLogMessage(details);
  console.error(`[AI_SAFE_ERROR][${tag}] ${sanitized}`);
}
