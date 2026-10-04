const EMAIL_RE = /(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi;
const PHONE_RE = /(?:\+?\d[\d .()/-]{7,}\d)/g;
const URL_RE = /(?:https?:\/\/|www\.)[^\s]+/gi;
const SOCIAL_RE = /(?:linkedin\.com|instagram\.com|facebook\.com|t\.me|wa\.me|x\.com|twitter\.com)/gi;
const NAME_LEAK_RE = /\b(?:je\s+suis|mon\s+nom\s+est|je\s+m'appelle|contactez[- ]moi|appelez[- ]moi|écrivez[- ]moi)\b/gi;
const COMPANY_RE = /\b(?:société|entreprise|company|cabinet|groupe)\s*[:=]\s*[^,.\n]{2,80}/gi;
const ADDRESS_RE = /\b(?:\d{1,5}\s+[^\n,]{3,80}\s+(?:rue|avenue|boulevard|chemin|route|street|road|drive|lane)\b|(?:rue|avenue|boulevard|chemin|route|street|road|drive|lane)\s+[^\n,]{3,80})/gi;

export type MessageModeration = {
  allowed: boolean;
  reason?: string;
  categories: string[];
  sanitizedPreview?: string;
};

export function moderateAnonymousMessage(input: string): MessageModeration {
  const body = input.normalize("NFKC");
  const compact = body.toLowerCase().replace(/[\s().\-_/]+/g, "");
  const categories: string[] = [];
  if (EMAIL_RE.test(body)) categories.push("EMAIL");
  EMAIL_RE.lastIndex = 0;
  if (/(?:\bat\b|\[at\]|\(at\)|\barobase\b).*(?:\bdot\b|\[dot\]|\(dot\)|\bpoint\b)/i.test(body)) categories.push("OBFUSCATED_EMAIL");
  if (PHONE_RE.test(body)) categories.push("PHONE");
  PHONE_RE.lastIndex = 0;
  if (/\d{8,}/.test(compact)) categories.push("PHONE_OR_IDENTIFIER");
  if (URL_RE.test(body)) categories.push("URL");
  URL_RE.lastIndex = 0;
  if (SOCIAL_RE.test(body)) categories.push("SOCIAL");
  SOCIAL_RE.lastIndex = 0;
  if (ADDRESS_RE.test(body)) categories.push("ADDRESS");
  ADDRESS_RE.lastIndex = 0;
  if (NAME_LEAK_RE.test(body)) categories.push("IDENTITY_DISCLOSURE");
  NAME_LEAK_RE.lastIndex = 0;
  if (COMPANY_RE.test(body)) categories.push("COMPANY_DISCLOSURE");
  ADDRESS_RE.lastIndex = 0;

  return {
    allowed: categories.length === 0,
    reason: categories.length ? "COORDINATE_OR_EXTERNAL_CONTACT" : undefined,
    categories,
    sanitizedPreview: body.replace(/[\r\n]+/g, " ").trim().slice(0, 240),
  };
}
