import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { configuredSources } from "@/lib/sourcing/global";
import { ingestGlobalJobs, refreshProactiveCandidatePool } from "@/lib/sourcing/ingest";
import { readBatchOffset, writeBatchOffset } from "@/lib/sourcing/batch-state";
import { selectNextSource } from "@/lib/sourcing/source-rotation";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const owner = await prisma.user.findFirst({ where: { role: "OWNER", status: "ACTIVE" }, select: { id: true } });
  if (!owner) return NextResponse.json({ error: "OWNER actif introuvable." }, { status: 503 });

  const sources = configuredSources("RP_GLOBAL_JOB_SOURCES");
  const results = [];
  const sourceRotationKey = "sourcing:global-jobs-source-rotation";
  const sourceOffset = await readBatchOffset(sourceRotationKey, sources.length);
  const rotation = selectNextSource(sources, sourceOffset);
  let sourceCursorSaved = true;

  // One feed and at most two offers per invocation. The offset rotates even if
  // a source fails, so one unavailable feed cannot starve the remaining sources.
  if (rotation.source) {
    try {
      results.push(await ingestGlobalJobs(rotation.source, owner.id, { maxItems: 2 }));
    } catch (error) {
      results.push({ sourceUrl: rotation.source, error: error instanceof Error ? error.message : "Erreur inconnue" });
    } finally {
      try {
        await writeBatchOffset(sourceRotationKey, rotation.nextOffset, rotation.total);
      } catch (error) {
        sourceCursorSaved = false;
        console.warn("[global-jobs] Source rotation checkpoint failed", error instanceof Error ? error.name : "UnknownError");
      }
    }
  }

  let proactive: Awaited<ReturnType<typeof refreshProactiveCandidatePool>> | null = null;
  try {
    proactive = await refreshProactiveCandidatePool(owner.id);
  } catch (error) {
    console.warn("[global-jobs] Proactive candidate pool refresh failed", error);
  }

  return NextResponse.json({ results, proactive, sourceRotation: { sourceCount: rotation.total, selectedIndex: rotation.index, nextOffset: rotation.nextOffset, checkpointSaved: sourceCursorSaved }, batchLimitPerSourceRun: 2 });
}
