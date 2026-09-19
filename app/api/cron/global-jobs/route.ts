import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { configuredSources } from "@/lib/sourcing/global";
import { ingest } from "@/app/api/sourcing/global-jobs/route";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const owner = await prisma.user.findFirst({ where: { role: "OWNER", status: "ACTIVE" }, select: { id: true } });
  if (!owner) return NextResponse.json({ error: "OWNER actif introuvable." }, { status: 503 });

  const sources = configuredSources("RP_GLOBAL_JOB_SOURCES");
  const results = [];
  for (const source of sources) {
    try { results.push(await ingest(source, owner.id)); }
    catch (error) { results.push({ sourceUrl: source, error: error instanceof Error ? error.message : "Erreur inconnue" }); }
  }
  return NextResponse.json({ results });
}
