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
  if (!r) return null;
  return {
    externalId: text(r.externalId ?? r.id ?? r.profileId) ?? `${source}:${index}`,
    source, sourceProfileUrl: text(r.sourceProfileUrl ?? r.profileUrl ?? r.url), name: text(r.name),
    headline: text(r.headline ?? r.title), location: text(r.location), country: text(r.country),
    skills: skills(r.skills), experienceYears: number(r.experienceYears), raw: value,
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

export async function fetchGlobalJobs(sourceUrl: string): Promise<GlobalJobItem[]> {
  const response = await fetch(sourceUrl, { headers: { accept: "application/json, application/rss+xml, application/atom+xml, text/xml" }, cache: "no-store" });
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

export async function fetchGlobalCandidates(sourceUrl: string): Promise<GlobalCandidateItem[]> {
  const response = await fetch(sourceUrl, { headers: { accept: "application/json" }, cache: "no-store" });
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

export function configuredSources(envName: string): string[] {
  const raw = process.env[envName];
  if (!raw) return envName === "RP_GLOBAL_JOB_SOURCES" ? [...DEFAULT_FREE_JOB_SOURCES] : [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    const configured = Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string" && /^https:\/\//i.test(v))
      : [];
    return configured.length || envName !== "RP_GLOBAL_JOB_SOURCES"
      ? configured
      : [...DEFAULT_FREE_JOB_SOURCES];
  } catch {
    return envName === "RP_GLOBAL_JOB_SOURCES" ? [...DEFAULT_FREE_JOB_SOURCES] : [];
  }
}
