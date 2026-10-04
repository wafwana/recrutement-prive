export type GlobalJobItem = {
  externalId: string; source: string; sourceUrl?: string; title: string; companyName?: string;
  country?: string; city?: string; categoryCode?: string; subCategoryCode?: string;
  skills?: string[]; experienceYears?: number; language?: string; salary?: string;
  publishedAt?: string; closingAt?: string; description?: string; raw?: unknown;
};

export type GlobalCandidateItem = {
  externalId: string; source: string; sourceProfileUrl?: string; name?: string; headline?: string;
  location?: string; country?: string; skills?: string[]; experienceYears?: number; raw?: unknown;
};

const text = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const number = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value);
  return undefined;
};

const skills = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(/[,;|\n]/).map((v) => v.trim()).filter(Boolean);
  return undefined;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function normalizeJob(value: unknown, source: string, index: number): GlobalJobItem | null {
  const r = asRecord(value);
  if (!r) return null;
  const title = text(r.title ?? r.name);
  if (!title) return null;
  return {
    externalId: text(r.externalId ?? r.id ?? r.guid) ?? `${source}:${index}:${title}`,
    source, sourceUrl: text(r.sourceUrl ?? r.url ?? r.link), title,
    companyName: text(r.companyName ?? r.company ?? r.employer ?? r.company_name), country: text(r.country), city: text(r.city),
    categoryCode: text(r.categoryCode ?? r.category), subCategoryCode: text(r.subCategoryCode ?? r.subCategory),
    skills: skills(r.skills ?? r.requiredSkills ?? r.tags), experienceYears: number(r.experienceYears ?? r.requiredExperienceYears),
    language: text(r.language), salary: text(r.salary), publishedAt: text(r.publishedAt ?? r.published ?? r.datePublished ?? r.createdAt ?? r.created_at),
    closingAt: text(r.closingAt ?? r.deadline ?? r.dateClosing), description: text(r.description ?? r.summary), raw: value,
  };
}

function normalizeCandidate(value: unknown, source: string, index: number): GlobalCandidateItem | null {
  const r = asRecord(value);
  if (!r || r.type === "Organization") return null;
  return {
    externalId: text(r.externalId ?? r.id ?? r.profileId ?? r.user_id) ?? source + ":" + index,
    source,
    sourceProfileUrl: text(r.sourceProfileUrl ?? r.profileUrl ?? r.html_url ?? r.link ?? r.url),
    name: text(r.name ?? r.login ?? r.display_name),
    headline: text(r.headline ?? r.title ?? r.bio ?? r.about_me),
    location: text(r.location),
    country: text(r.country),
    skills: skills(r.skills ?? r.tags),
    experienceYears: number(r.experienceYears),
    raw: value,
  };
}

function parseXmlItems(xml: string, source: string): GlobalJobItem[] {
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) ?? [];
  return blocks.flatMap((block, index) => {
    const pick = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}(?:[^>]*)>([\\s\\S]*?)<\\/${tag}>`, "i"));
      return m?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, "").trim();
    };
    const link = block.match(/<link(?:[^>]*href=["']([^"']+)["'][^>]*)\/?\s*>/i)?.[1] ?? pick("link");
    return normalizeJob({ id: pick("guid") ?? pick("id"), title: pick("title"), description: pick("description") ?? pick("summary"), url: link, publishedAt: pick("pubDate") ?? pick("published") }, source, index);
  }).filter((item): item is GlobalJobItem => Boolean(item));
}

export async function fetchGlobalJobs(sourceUrl: string, requester?: PinnedSourceRequester): Promise<GlobalJobItem[]> {
  const response = await fetchSafeSource(sourceUrl, { headers: { accept: "application/json, application/rss+xml, application/atom+xml, text/xml" }, cache: "no-store" }, requester);
  if (!response.ok) throw new Error(`Source jobs inaccessible: HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();
  if (contentType.includes("json") || /^[\s]*[\[{]/.test(body)) {
    const parsed = JSON.parse(body) as unknown;
    const root = asRecord(parsed);
    const items = Array.isArray(parsed) ? parsed : (root?.items ?? root?.jobs ?? root?.data ?? []);
    return Array.isArray(items) ? items.map((item, i) => normalizeJob(item, sourceUrl, i)).filter((x): x is GlobalJobItem => Boolean(x)) : [];
  }
  return parseXmlItems(body, sourceUrl);
}

export async function fetchGlobalCandidates(sourceUrl: string, requester?: PinnedSourceRequester): Promise<GlobalCandidateItem[]> {
  const response = await fetchSafeSource(sourceUrl, { headers: { accept: "application/json" }, cache: "no-store" }, requester);
  if (!response.ok) throw new Error(`Source candidates inaccessible: HTTP ${response.status}`);
  const parsed = JSON.parse(await response.text()) as unknown;
  const root = asRecord(parsed);
  const items = Array.isArray(parsed) ? parsed : (root?.items ?? root?.candidates ?? []);
  return Array.isArray(items) ? items.map((item, i) => normalizeCandidate(item, sourceUrl, i)).filter((x): x is GlobalCandidateItem => Boolean(x)) : [];
}

const DEFAULT_FREE_JOB_SOURCES = [
  "https://www.arbeitnow.com/api/job-board-api",
  "https://www.arbeitnow.co.uk/api/job-board-api",
] as const;

const DEFAULT_FREE_CANDIDATE_SOURCES = [
  "https://api.github.com/users?per_page=30",
  "https://api.stackexchange.com/2.3/users?site=stackoverflow&pagesize=30",
] as const;

import { prisma } from "@/lib/prisma";
import { request as httpsRequest } from "node:https";
import { assertPublicDnsHost, isSafeHttpsUrl } from "@/lib/security/ssrf";

async function requestPinnedHttps(url: URL, init: RequestInit, address: string, family: number): Promise<Response> {
  return new Promise((resolve, reject) => {
    const headers = new Headers(init.headers);
    const request = httpsRequest(url, {
      method: "GET",
      headers: Object.fromEntries(headers.entries()),
      servername: url.hostname,
      lookup: (_hostname, _options, callback) => callback(null, address, family),
    }, (incoming) => {
      const chunks: Buffer[] = [];
      incoming.on("data", (chunk: Buffer | string) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      incoming.on("end", () => {
        const responseHeaders = new Headers();
        for (const [name, value] of Object.entries(incoming.headers)) {
          if (Array.isArray(value)) value.forEach((entry) => responseHeaders.append(name, entry));
          else if (typeof value === "string") responseHeaders.set(name, value);
        }
        resolve(new Response(Buffer.concat(chunks), { status: incoming.statusCode ?? 502, statusText: incoming.statusMessage, headers: responseHeaders }));
      });
    });
    request.setTimeout(15000, () => request.destroy(new Error("Source request timed out.")));
    request.on("error", reject);
    request.end();
  });
}

type PinnedSourceRequester = (url: URL, init: RequestInit, address: string, family: number) => Promise<Response>;

async function fetchSafeSource(input: string, init: RequestInit, requester: PinnedSourceRequester = requestPinnedHttps): Promise<Response> {
  let current = input;
  for (let redirects = 0; redirects <= 5; redirects++) {
    const checked = isSafeHttpsUrl(current);
    if (!checked.safe || !checked.url) throw new Error(`Source URL rejected: ${checked.reason ?? "invalid URL"}`);
    const url = new URL(checked.url);
    const resolved = await assertPublicDnsHost(url.hostname);
    const response = await requester(url, init, resolved.address, resolved.family);
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    if (!location) return response;
    if (redirects === 5) throw new Error("Source redirect limit exceeded.");
    current = new URL(location, checked.url).toString();
  }
  throw new Error("Source redirect limit exceeded.");
}


export function configuredSources(envName: string): string[] {
  const raw = process.env[envName];
  if (!raw) {
    if (envName === "RP_GLOBAL_JOB_SOURCES") return [...DEFAULT_FREE_JOB_SOURCES];
    if (envName === "RP_GLOBAL_CANDIDATE_SOURCES") return [...DEFAULT_FREE_CANDIDATE_SOURCES];
    return [];
  }
  try {
    const parsed = typeof raw === "string" && raw.trim().startsWith("[") ? JSON.parse(raw) as unknown : raw.split(/[,;\n]/);
    const configured = Array.isArray(parsed)
      ? parsed.map((v) => (typeof v === "string" ? v.trim() : "")).filter((v): v is string => Boolean(v) && /^https:\/\//i.test(v))
      : [];
    if (configured.length > 0) return configured;
    if (envName === "RP_GLOBAL_JOB_SOURCES") return [...DEFAULT_FREE_JOB_SOURCES];
    if (envName === "RP_GLOBAL_CANDIDATE_SOURCES") return [...DEFAULT_FREE_CANDIDATE_SOURCES];
    return [];
  } catch {
    if (envName === "RP_GLOBAL_JOB_SOURCES") return [...DEFAULT_FREE_JOB_SOURCES];
    if (envName === "RP_GLOBAL_CANDIDATE_SOURCES") return [...DEFAULT_FREE_CANDIDATE_SOURCES];
    return [];
  }
}

export async function getConfiguredSourcesAsync(envName: string): Promise<string[]> {
  const envSources = configuredSources(envName);
  if (envSources.length > 0) return envSources;

  if (envName === "RP_GLOBAL_CANDIDATE_SOURCES" && process.env.DATABASE_URL) {
    try {
      const record = await prisma.systemSetting.findUnique({
        where: { key: "sourcing:candidate_sources" },
        select: { value: true },
      });
      if (record && Array.isArray(record.value)) {
        const dbSources = record.value
          .filter((v): v is string => typeof v === "string" && isSafeHttpsUrl(v).safe)
          .map((v) => isSafeHttpsUrl(v).url || v.trim());
        if (dbSources.length > 0) return dbSources;
      }
    } catch (err) {
      console.warn("[getConfiguredSourcesAsync] Failed to fetch DB candidate sources:", err);
    }
  }

  return envName === "RP_GLOBAL_JOB_SOURCES" ? [...DEFAULT_FREE_JOB_SOURCES] : [];
}
