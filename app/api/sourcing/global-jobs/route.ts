import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ingestGlobalJobs } from "@/lib/sourcing/ingest";
import { configuredSources, fetchGlobalJobs } from "@/lib/sourcing/global";

async function requireStaff() {
  const active = getActiveSessionContext();
  const session = active || (await auth());
  if (!session?.user?.id || !["OWNER", "ADMIN", "CONSULTANT"].includes(session.user.role ?? "")) return null;
  return session.user.id;
}

export async function POST(request: Request) {
  const actor = await requireStaff();
  if (!actor) return NextResponse.json({ error: "Accès réservé à l'équipe Recrutement Privé." }, { status: 403 });
  let body: unknown = {};
  try { body = await request.json(); } catch {}
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
