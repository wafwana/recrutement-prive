import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { ingestGlobalJobs } from "@/lib/sourcing/ingest";
import { configuredSources } from "@/lib/sourcing/global";
import { hasPermission } from "@/lib/auth/permissions";

async function requireStaffPermission() {
  const active = getActiveSessionContext();
  const session = active || (await auth());
  const userId = typeof session?.user?.id === "string" ? session.user.id : undefined;
  const role = typeof session?.user?.role === "string" ? session.user.role : undefined;
  if (!userId || !["OWNER", "ADMIN", "CONSULTANT"].includes(role ?? "")) return null;
  if (!(await hasPermission(userId, role, "SOURCING"))) return null;
  return userId;
}
export async function POST(request: Request) {
  const actor = await requireStaffPermission();
  if (!actor) return NextResponse.json({ error: "Permission de sourcing non accordée par l'Owner." }, { status: 403 });
  let body: unknown = {}; try { body = await request.json(); } catch {}
  const sourceUrl = typeof body === "object" && body && "sourceUrl" in body && typeof (body as {sourceUrl?: unknown}).sourceUrl === "string"
    ? (body as {sourceUrl:string}).sourceUrl : null;
  const sources = sourceUrl && /^https:\/\//i.test(sourceUrl) ? [sourceUrl] : configuredSources("RP_GLOBAL_JOB_SOURCES");
  if (!sources.length) return NextResponse.json({ error: "Aucune source HTTPS configurée." }, { status: 400 });
  const results = [];
  for (const source of sources) {
    try { results.push(await ingestGlobalJobs(source, actor)); }
    catch (error) { results.push({ sourceUrl: source, error: error instanceof Error ? error.message : "Erreur inconnue" }); }
  }
  return NextResponse.json({ results });
}
