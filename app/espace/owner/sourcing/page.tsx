import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { configuredSources } from "@/lib/sourcing/global";
import BackButton from "@/components/navigation/BackButton";
import SourcingRunButton from "@/components/owner/SourcingRunButton";
import CandidateSourcingClient from "@/components/owner/CandidateSourcingClient";

export default async function OwnerSourcingPage() {
  const session = await auth();
  if (!session?.user?.id || !["OWNER", "ADMIN", "CONSULTANT"].includes(session.user.role || "")) redirect("/connexion");
  const fallbackRedirect = session.user.role === "ADMIN" ? "/espace/admin" : session.user.role === "CONSULTANT" ? "/espace/consultant" : "/espace";
  if (!(await hasPermission(session.user.id, session.user.role, "SOURCING"))) redirect(fallbackRedirect);

  const jobSources = configuredSources("RP_GLOBAL_JOB_SOURCES");
  const candidateSources = configuredSources("RP_GLOBAL_CANDIDATE_SOURCES");

  const [offers, candidatesRaw, jobs] = await Promise.all([
    prisma.externalJobOpportunity.findMany({
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 100,
      select: {
        id: true,
        title: true,
        companyName: true,
        country: true,
        city: true,
        source: true,
        sourceUrl: true,
        publishedAt: true,
        categoryCode: true,
        subCategoryCode: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.sourcedCandidate.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        externalId: true,
        source: true,
        sourceProfileUrl: true,
        sourceCollectedAt: true,
        name: true,
        headline: true,
        location: true,
        skills: true,
        experienceYears: true,
        status: true,
        matchingScore: true,
        notes: true,
        createdAt: true,
      },
    }),
    prisma.job.findMany({
      where: { status: "OPEN" },
      select: { id: true, title: true },
      take: 50,
    }),
  ]);

  const lastJobAudit = await prisma.auditLog.findFirst({
    where: { action: "GLOBAL_JOB_SOURCING" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, details: true },
  });

  const lastCandidateAudit = await prisma.auditLog.findFirst({
    where: { action: "GLOBAL_CANDIDATE_SOURCING" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, details: true },
  });

  const formattedCandidates = candidatesRaw.map((c) => ({
    id: c.id,
    externalId: c.externalId,
    source: c.source,
    sourceProfileUrl: c.sourceProfileUrl,
    sourceCollectedAt: c.sourceCollectedAt ? c.sourceCollectedAt.toISOString() : null,
    name: c.name,
    headline: c.headline,
    location: c.location,
    skills: Array.isArray(c.skills) ? (c.skills as string[]) : null,
    experienceYears: c.experienceYears,
    status: c.status,
    matchingScore: c.matchingScore,
    notes: c.notes,
    createdAt: c.createdAt.toISOString(),
  }));

  const candidateAuditSummary = lastCandidateAudit
    ? { createdAt: lastCandidateAudit.createdAt.toISOString(), details: lastCandidateAudit.details }
    : null;

  return (
    <section className="mx-auto w-[min(1280px,calc(100%-40px))] py-12 md:w-[min(1280px,calc(100%-72px))] md:py-20">
      <BackButton />
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">{session.user.role === "OWNER" ? "Owner" : "Sourcing"} · Cockpit Sourcing Automatique</p>
          <h1 className="mt-4 font-serif text-4xl sm:text-5xl">Sourcing Candidats & Offres.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/50">
            Collecte et qualification automatisées depuis des sources autorisées. Déduplication native, préservation de la provenance
            et validation humaine obligatoire par l&apos;équipe RP avant toute prise de contact.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex flex-wrap justify-end gap-2">
            <a href="/espace/owner/offres-vivier" className="border border-[#c7a15a] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#c7a15a] hover:bg-[#c7a15a]/10">
              Vivier des offres
            </a>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-[#c7a15a]/30 px-4 py-3 text-right">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Offres détectées</p>
              <p className="mt-1 font-serif text-2xl text-[#c7a15a]">{offers.length}</p>
            </div>
            <div className="border border-[#c7a15a]/30 px-4 py-3 text-right">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Candidats sourcés</p>
              <p className="mt-1 font-serif text-2xl text-[#c7a15a]">{candidatesRaw.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="mt-12 space-y-16">
        {/* SECTION 1: Sourcing Candidats */}
        <div>
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">01 · Profils Candidats</p>
              <h2 className="mt-1 font-serif text-2xl text-white">Sourcing candidats automatisé</h2>
            </div>
          </div>

          <CandidateSourcingClient
            initialCandidates={formattedCandidates}
            activeSourcesCount={candidateSources.length}
            candidateSources={candidateSources}
            jobs={jobs}
            lastAudit={candidateAuditSummary}
          />
        </div>

        {/* SECTION 2: Sourcing Offres */}
        <div>
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#F97316]">02 · Offres Externe</p>
              <h2 className="mt-1 font-serif text-2xl text-white">Vivier de sourcing d&apos;offres</h2>
            </div>
            <SourcingRunButton />
          </div>

          {jobSources.length === 0 ? (
            <div className="mb-6 border border-[#F97316]/40 bg-[#F97316]/10 p-5 text-sm text-white/80">
              <h3 className="font-medium text-[#F97316]">Aucune source d&apos;offres active</h3>
              <p className="mt-1 text-xs text-white/60">
                Configurez <code className="bg-black/40 px-1 py-0.5 text-[#c7a15a]">RP_GLOBAL_JOB_SOURCES</code> avec un tableau d&apos;URLs HTTPS d&apos;APIs ou flux d&apos;offres.
              </p>
            </div>
          ) : (
            <div className="mb-6 flex items-center justify-between border border-[#F97316]/30 bg-[#111] p-4 text-xs text-white/70">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  <strong className="text-white">{jobSources.length}</strong> source(s) d&apos;offres active(s) configurée(s)
                </span>
              </div>
              <div className="text-[10px] text-white/40">
                {lastJobAudit ? `Dernier passage : ${new Date(lastJobAudit.createdAt).toLocaleString("fr-FR")}` : "Aucun historique"}
              </div>
            </div>
          )}

          <div className="overflow-hidden border border-white/10">
            <div className="grid grid-cols-1 border-b border-white/10 bg-[#111] px-5 py-4 text-[10px] uppercase tracking-[0.16em] text-white/35 md:grid-cols-[2fr_1.1fr_1fr_1fr_1fr]">
              <span>Offre</span>
              <span>Entreprise</span>
              <span>Localisation</span>
              <span>Catégorie</span>
              <span>Source & Statut</span>
            </div>

            <div className="divide-y divide-white/10">
              {offers.map((offer) => (
                <article key={offer.id} className="grid grid-cols-1 gap-3 px-5 py-5 md:grid-cols-[2fr_1.1fr_1fr_1fr_1fr] md:items-center">
                  <div>
                    <p className="text-sm font-medium text-white/85">{offer.title}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/40">{offer.status}</p>
                  </div>
                  <p className="text-xs text-white/55">{offer.companyName || "Entreprise non renseignée"}</p>
                  <p className="text-xs text-white/55">{[offer.city, offer.country].filter(Boolean).join(", ") || "—"}</p>
                  <p className="text-xs text-white/55">
                    {offer.categoryCode || "À qualifier"}
                    {offer.subCategoryCode ? ` · ${offer.subCategoryCode}` : ""}
                  </p>
                  <div className="text-xs">
                    {offer.sourceUrl ? (
                      <a href={offer.sourceUrl} target="_blank" rel="noreferrer" className="text-[#F97316] hover:underline">
                        Voir la source
                      </a>
                    ) : (
                      <span className="text-white/30">{offer.source}</span>
                    )}
                    {offer.publishedAt && (
                      <p className="mt-1 text-[10px] text-white/25">{new Date(offer.publishedAt).toLocaleDateString("fr-FR")}</p>
                    )}
                  </div>
                </article>
              ))}

              {offers.length === 0 && (
                <div className="px-5 py-12 text-center text-sm text-white/35">
                  Aucune offre détectée pour le moment. Le prochain passage automatique alimentera cette liste.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
