import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { ingestGlobalJobs } from "@/lib/sourcing/ingest";
import { configuredSources } from "@/lib/sourcing/global";
import { hasPermission } from "@/lib/auth/permissions";
import { readBatchOffset, writeBatchOffset } from "@/lib/sourcing/batch-state";
import { selectNextSource } from "@/lib/sourcing/source-rotation";

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
  const explicitSource = sourceUrl && /^https:\/\//i.test(sourceUrl) ? sourceUrl : null;
  const sources = explicitSource ? [explicitSource] : configuredSources("RP_GLOBAL_JOB_SOURCES");
  if (!sources.length) return NextResponse.json({ error: "Aucune source HTTPS configurée." }, { status: 400 });

  const cursorKey = "sourcing:manual-global-jobs-source-rotation";
  const sourceOffset = explicitSource ? 0 : await readBatchOffset(cursorKey, sources.length);
  const rotation = selectNextSource(sources, sourceOffset);
  if (!rotation.source) return NextResponse.json({ error: "Aucune source disponible." }, { status: 400 });

  let checkpointSaved = true;
  const results = [];
  try {
    results.push(await ingestGlobalJobs(rotation.source, actor, { maxItems: 2 }));
  } catch (error) {
    results.push({ sourceUrl: rotation.source, error: error instanceof Error ? error.message : "Erreur inconnue" });
  } finally {
    if (!explicitSource) {
      try { await writeBatchOffset(cursorKey, rotation.nextOffset, rotation.total); }
      catch (error) {
        checkpointSaved = false;
        console.warn("[global-sourcing] Source cursor checkpoint failed", error instanceof Error ? error.name : "UnknownError");
      }
    }
  }
  return NextResponse.json({ results, sourceRotation: { sourceCount: rotation.total, selectedIndex: rotation.index, nextOffset: rotation.nextOffset, checkpointSaved }, batchLimitPerSourceRun: 2 });
}
