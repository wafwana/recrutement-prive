import { URL } from "url";

export function isSafeHttpsUrl(inputUrl: string): { safe: boolean; reason?: string; url?: string } {
  if (!inputUrl || typeof inputUrl !== "string") {
    return { safe: false, reason: "URL absente ou invalide." };
  }

  const trimmed = inputUrl.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { safe: false, reason: "Format d'URL malformé." };
  }

  if (parsed.protocol !== "https:") {
    return { safe: false, reason: "Protocol non sécurisé. Seul HTTPS est autorisé." };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost and internal domain names
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname === "0.0.0.0" ||
    hostname === "::" ||
    hostname === "::1"
  ) {
    return { safe: false, reason: "Accès aux hôtes locaux ou internes strictement interdit (SSRF)." };
  }

  // IPv4 Private & Reserved Ranges Check
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Regex);
  if (match) {
    const octets = match.slice(1, 5).map(Number);
    if (octets.some((o) => o < 0 || o > 255)) {
      return { safe: false, reason: "Adresse IP IPv4 invalide." };
    }

    const [o1, o2] = octets;

    // 127.0.0.0/8 Loopback
    if (o1 === 127) {
      return { safe: false, reason: "Adresse IP de bouclage (127.0.0.0/8) interdite (SSRF)." };
    }
    // 10.0.0.0/8 Private network
    if (o1 === 10) {
      return { safe: false, reason: "Réseau privé (10.0.0.0/8) interdit (SSRF)." };
    }
    // 172.16.0.0/12 Private network
    if (o1 === 172 && o2 >= 16 && o2 <= 31) {
      return { safe: false, reason: "Réseau privé (172.16.0.0/12) interdit (SSRF)." };
    }
    // 192.168.0.0/16 Private network
    if (o1 === 192 && o2 === 168) {
      return { safe: false, reason: "Réseau privé (192.168.0.0/16) interdit (SSRF)." };
    }
    // 169.254.0.0/16 Link-local / Cloud metadata (AWS/GCP/Azure IMDS)
    if (o1 === 169 && o2 === 254) {
      return { safe: false, reason: "Adresse Link-local / Métadonnées Cloud (169.254.0.0/16) interdite (SSRF)." };
    }
    // 0.0.0.0/8
    if (o1 === 0) {
      return { safe: false, reason: "Adresse réseau réservée (0.0.0.0/8) interdite." };
    }
  }

  return { safe: true, url: parsed.toString() };
}
