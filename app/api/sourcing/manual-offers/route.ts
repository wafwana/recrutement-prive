import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { configuredSources } from "@/lib/sourcing/global";
import { ingestGlobalJobs } from "@/lib/sourcing/ingest";

type Criterion = { sectorCode: string; professionCode: string; professionName: string; profileTitle?: string };

async function requireSourcingActor() {
  const active = getActiveSessionContext();
  const session = active || (await auth());
  const userId = typeof session?.user?.id === "string" ? session.user.id : undefined;
  const role = typeof session?.user?.role === "string" ? session.user.role : undefined;
  if (!userId || !["OWNER", "ADMIN", "CONSULTANT"].includes(role ?? "")) return null;
  if (!(await hasPermission(userId, role, "SOURCING")) || !(await hasPermission(userId, role, "METIERS_DOSSIERS"))) return null;
  return { userId, role };
}

export async function POST(request: Request) {
  const actor = await requireSourcingActor();
  if (!actor) return NextResponse.json({ error: "Permission de sourcing non accordée." }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 }); }
  const value = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const criteria = Array.isArray(value.criteria) ? value.criteria as Criterion[] : [];
  const country = typeof value.country === "string" ? value.country.trim().slice(0, 100) : "";
  if (!criteria.length || criteria.length > 40 || criteria.some((item) =>
    !item || typeof item.sectorCode !== "string" || typeof item.professionCode !== "string" ||
    typeof item.professionName !== "string" || (item.profileTitle !== undefined && typeof item.profileTitle !== "string")
  )) return NextResponse.json({ error: "Sélection de métiers invalide (1 à 40 critères)." }, { status: 400 });

  const sources = configuredSources("RP_GLOBAL_JOB_SOURCES").slice(0, 4);
  if (!sources.length) return NextResponse.json({ error: "Aucune source d'offres HTTPS configurée." }, { status: 400 });

  const terms = Array.from(new Set(criteria.flatMap((item) => [item.profileTitle, item.professionName]).filter((term): term is string => Boolean(term?.trim())))).slice(0, 40);
  const folder = await prisma.offerSourcingSearch.create({
    data: {
      title: `Offres · ${criteria.length} critère(s) · ${new Date().toLocaleDateString("fr-FR")}`,
      criteria: criteria as unknown as object,
      country: country || null,
      status: "RUNNING",
      createdByUserId: actor.userId,
    },
  });

  const startedAt = new Date();
  const results: Array<Record<string, unknown>> = [];
  try {
    for (const sourceUrl of sources) {
      try {
        results.push(await ingestGlobalJobs(sourceUrl, actor.userId, {
          maxItems: 5,
          filterTerms: [...terms, ...(country ? [country] : [])],
        }));
      } catch (error) {
        results.push({ sourceUrl, error: error instanceof Error ? error.message : "Erreur de collecte" });
      }
    }
    const fetched = results.reduce((sum, item) => sum + (typeof item.fetched === "number" ? item.fetched : 0), 0);
    const failures = results.filter((item) => typeof item.error === "string").length;
    await prisma.offerSourcingSearch.update({
      where: { id: folder.id },
      data: {
        status: failures === results.length ? "FAILED" : "COMPLETED",
        sourceSummary: { startedAt: startedAt.toISOString(), completedAt: new Date().toISOString(), sources: results, fetched, failures, terms, country: country || null },
        lastError: failures === results.length ? "Toutes les sources configurées ont échoué." : null,
      },
    });
    await prisma.auditLog.create({
      data: {
        actorUserId: actor.userId,
        actorRole: actor.role,
        action: "MANUAL_TARGETED_OFFER_SEARCH",
        targetType: "OFFER_SOURCING_SEARCH",
        targetId: folder.id,
        details: { criteriaCount: criteria.length, sourceCount: sources.length, fetched, failures },
      },
    });
    return NextResponse.json({ search: { id: folder.id, status: failures === results.length ? "FAILED" : "COMPLETED", fetched, failures } });
  } catch (error) {
    await prisma.offerSourcingSearch.update({
      where: { id: folder.id },
      data: { status: "FAILED", lastError: error instanceof Error ? error.message.slice(0, 500) : "Erreur inconnue" },
    });
    return NextResponse.json({ error: "La recherche d'offres a échoué.", searchId: folder.id }, { status: 500 });
  }
}
