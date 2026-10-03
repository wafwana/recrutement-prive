import { URL } from "url";

export function isSafeHttpsUrl(inputUrl: string): { safe: boolean; reason?: string; url?: string } {
  if (!inputUrl || typeof inputUrl !== "string") {
    return { safe: false, reason: "URL absente ou invalide." };
  }

  let parsed: URL;
  try {
    parsed = new URL(inputUrl.trim());
  } catch {
    return { safe: false, reason: "Format d'URL malformé." };
  }

  if (parsed.protocol !== "https:") {
    return { safe: false, reason: "Protocole non sécurisé. Seul HTTPS est autorisé." };
  }
  if (parsed.username || parsed.password) {
    return { safe: false, reason: "Les identifiants intégrés aux URL sont interdits." };
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (
    hostname === "localhost" || hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") || hostname.endsWith(".internal") ||
    hostname.endsWith(".test") || hostname === "0.0.0.0"
  ) {
    return { safe: false, reason: "Accès aux hôtes locaux ou internes strictement interdit (SSRF)." };
  }

  // Reject IPv6 literals conservatively; public hostnames remain supported.
  if (hostname.includes(":")) {
    return { safe: false, reason: "Les adresses IPv6 littérales sont interdites pour les sources (SSRF)." };
  }

  const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const octets = ipv4.slice(1).map(Number);
    if (octets.some((octet) => octet < 0 || octet > 255)) {
      return { safe: false, reason: "Adresse IP IPv4 invalide." };
    }
    const [a, b, c] = octets;
    const blocked =
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0 && c === 0) ||
      (a === 192 && b === 0 && c === 2) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224;
    if (blocked) {
      return { safe: false, reason: "Adresse IPv4 privée, réservée ou non routable interdite (SSRF)." };
    }
  }

  return { safe: true, url: parsed.toString() };
}
