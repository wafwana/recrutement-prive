import { URL } from "node:url";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export function isSafeHttpsUrl(inputUrl: string): { safe: boolean; reason?: string; url?: string } {
  if (!inputUrl || typeof inputUrl !== "string") return { safe: false, reason: "URL absente ou invalide." };
  let parsed: URL;
  try { parsed = new URL(inputUrl.trim()); }
  catch { return { safe: false, reason: "Format d'URL malformé." }; }

  if (parsed.protocol !== "https:") return { safe: false, reason: "Seul HTTPS est autorisé." };
  if (parsed.username || parsed.password) return { safe: false, reason: "Les identifiants intégrés aux URL sont interdits." };

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") || hostname.endsWith(".internal") || hostname.endsWith(".test")) {
    return { safe: false, reason: "Accès aux hôtes locaux ou internes interdit (SSRF)." };
  }
  if (isIP(hostname) === 6) return { safe: false, reason: "Les adresses IPv6 littérales sont interdites pour les sources." };
  if (isIP(hostname) === 4 && !isPublicIpAddress(hostname)) {
    return { safe: false, reason: "Adresse IPv4 privée, réservée ou non routable interdite (SSRF)." };
  }
  return { safe: true, url: parsed.toString() };
}

function ipv4ToNumber(ip: string): number {
  return ip.split(".").reduce((value, part) => ((value * 256) + Number(part)) >>> 0, 0);
}

function inCidr(ip: number, network: string, bits: number): boolean {
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ip & mask) === (ipv4ToNumber(network) & mask);
}

/** True only for globally routable addresses suitable for outbound sourcing. */
export function isPublicIpAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const ip = ipv4ToNumber(address);
    const blocked = [
      ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
      ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24],
      ["192.0.2.0", 24], ["192.88.99.0", 24], ["192.168.0.0", 16],
      ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
      ["224.0.0.0", 4], ["240.0.0.0", 4],
    ] as const;
    return !blocked.some(([network, bits]) => inCidr(ip, network, bits));
  }
  if (family === 6) {
    const normalized = address.toLowerCase().split("%")[0];
    if (normalized.startsWith("::ffff:")) {
      const mapped = normalized.slice(7);
      if (isIP(mapped) === 4) return isPublicIpAddress(mapped);
      return false;
    }
    const groups = normalized.split(":");
    const missing = 8 - groups.filter(Boolean).length;
    const compressedIndex = groups.indexOf("");
    const expanded = compressedIndex >= 0
      ? [...groups.slice(0, compressedIndex).filter(Boolean), ...Array(missing).fill("0"), ...groups.slice(compressedIndex + 1).filter(Boolean)]
      : groups;
    if (expanded.length !== 8) return false;
    const full = expanded.map((part) => Number.parseInt(part || "0", 16));
    const first = full[0];
    // Only global-unicast 2000::/3 is allowed.
    if ((first & 0xe000) !== 0x2000) return false;
    // Reject IANA special-purpose allocations and transition mechanisms.
    if (first === 0x2001 && (full[1] <= 0x01ff || full[1] === 0x0db8)) return false;
    if (first === 0x2002) return false; // 6to4 can encapsulate private IPv4 destinations
    return true;
  }
  return false;
}

/**
 * Resolve every DNS answer and reject the hostname if any answer is non-public.
 * Call immediately before each outbound request and after every redirect.
 */
export async function assertPublicDnsHost(hostname: string): Promise<{ address: string; family: number }> {
  if (isIP(hostname)) {
    if (!isPublicIpAddress(hostname)) throw new Error("Source DNS resolved to a non-public address (SSRF).");
    return { address: hostname, family: isIP(hostname) };
  }
  let records: Array<{ address: string; family: number }>;
  try { records = await lookup(hostname, { all: true, verbatim: true }); }
  catch { throw new Error("Source hostname could not be resolved safely."); }
  if (!records.length || records.some((record) => !isPublicIpAddress(record.address))) {
    throw new Error("Source DNS resolved to a private, reserved, or non-routable address (SSRF).");
  }
  return records[0];
}
