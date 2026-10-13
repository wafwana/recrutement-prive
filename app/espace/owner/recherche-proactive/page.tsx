import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import BackButton from "@/components/navigation/BackButton";
import ArchiveProactiveSearchButton from "@/components/owner/ArchiveProactiveSearchButton";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export default async function ProactiveSearchHistoryPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session?.user?.id || !["OWNER", "ADMIN", "CONSULTANT"].includes(session.user.role || "")) redirect("/connexion");
  const fallback = session.user.role === "ADMIN" ? "/espace/admin" : session.user.role === "CONSULTANT" ? "/espace/consultant" : "/espace";
  if (!(await hasPermission(session.user.id, session.user.role, "SOURCING")) ||
      !(await hasPermission(session.user.id, session.user.role, "METIERS_DOSSIERS"))) redirect(fallback);

  const params = await searchParams;
  const selectedId = one(params.id) || "";
  const where = session.user.role === "OWNER"
    ? {}
    : { createdByUserId: session.user.id };

  const [searches, selected, notifications] = await Promise.all([
    prisma.proactiveSearch.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { _count: { select: { results: true } } },
    }),
    selectedId
      ? prisma.proactiveSearch.findFirst({
          where: { id: selectedId, ...where },
          include: {
            results: {
              orderBy: { createdAt: "desc" },
              include: {
                sourcedCandidate: {
                  select: { id: true, name: true, headline: true, location: true, skills: true, source: true, sourceProfileUrl: true, status: true },
                },
              },
            },
          },
        })
      : Promise.resolve(null),
    session.user.role === "OWNER"
      ? prisma.ownerNotification.findMany({
          where: { senderName: "Sourcing proactif" },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : Promise.resolve([]),
  ]);

  const summary = asRecord(selected?.sourceSummary);
  const sourceRows = Array.isArray(summary.sources)
    ? summary.sources.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];

  return (
    <section className="mx-auto w-[min(1280px,calc(100%-32px))] py-10 md:w-[min(1280px,calc(100%-72px))] md:py-16">
      <BackButton fallback="/espace/owner" />
      <div className="flex flex-col gap-4 border-b border-white/10 pb-7 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#F97316]">Sourcing · Recherche proactive</p>
          <h1 className="mt-3 font-serif text-4xl text-white md:text-5xl">Recherches de candidats</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/50">Historique des recherches indépendantes d'une offre ou d'un client. Les profils sont dédupliqués dans le vivier existant. Un profil sourcé sans CV analysé reste non vérifié et aucun candidat n'est contacté automatiquement.</p>
        </div>
        <Link href="/espace/owner/metiers" className="inline-flex border border-[#F97316]/50 bg-[#F97316]/10 px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-[#F97316]">Lancer depuis un métier</Link>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="border border-white/10 bg-[#111] p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-xl text-white">Historique</h2>
            <span className="text-xs text-white/35">{searches.length} recherche(s)</span>
          </div>
          <div className="mt-4 space-y-2">
            {searches.map((item) => (
              <Link key={item.id} href={`/espace/owner/recherche-proactive?id=${item.id}`} className={"block border p-4 transition " + (selected?.id === item.id ? "border-[#F97316]/60 bg-[#F97316]/5" : "border-white/10 bg-[#080808] hover:border-white/25")}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-white/85">{item.title}</p>
                  <span className="text-[9px] uppercase tracking-[0.12em] text-[#F97316]">{item.status}</span>
                </div>
                <p className="mt-2 text-[10px] text-white/40">{item.query || "Recherche par secteur"}{item.country ? " · " + item.country : ""}</p>
                <p className="mt-2 text-[10px] text-white/30">{item._count.results} résultat(s) · {new Date(item.createdAt).toLocaleString("fr-FR")}</p>
              </Link>
            ))}
            {searches.length === 0 && <p className="border border-dashed border-white/15 p-6 text-sm text-white/40">Aucune recherche enregistrée. Lance une recherche depuis un secteur ou un métier.</p>}
          </div>
          <div className="mt-6 border-t border-white/10 pt-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[10px] uppercase tracking-[0.16em] text-white/45">Notifications de nouveaux profils</h3>
              <span className="text-[10px] text-white/30">{notifications.length}</span>
            </div>
            <div className="mt-3 space-y-2">
              {notifications.map((notification) => (
                <article key={notification.id} className="border border-white/10 bg-[#080808] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs text-white/80">{notification.title}</p>
                    <span className="text-[9px] uppercase text-[#F97316]">{notification.status}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-white/45">{notification.message}</p>
                  <p className="mt-2 text-[10px] text-white/25">{new Date(notification.createdAt).toLocaleString("fr-FR")}</p>
                </article>
              ))}
              {notifications.length === 0 && <p className="text-xs text-white/35">Aucune nouvelle notification de sourcing.</p>}
            </div>
          </div>
        </section>

        <section className="border border-white/10 bg-[#111] p-4 md:p-5">
          {selected ? (
            <>
              <div className="border-b border-white/10 pb-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#F97316]">Détail de la recherche</p>
                <h2 className="mt-2 font-serif text-2xl text-white">{selected.title}</h2>
                <p className="mt-2 text-xs text-white/45">Statut : {selected.status} · lancée le {new Date(selected.createdAt).toLocaleString("fr-FR")}</p>
                {selected.completedAt && <p className="mt-1 text-xs text-white/35">Terminée le {new Date(selected.completedAt).toLocaleString("fr-FR")}</p>}
                {selected.lastError && <p className="mt-3 border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-200">{selected.lastError}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/espace/owner/metiers?sector=${encodeURIComponent(selected.sectorCode)}${selected.professionCode ? `&profession=${encodeURIComponent(selected.professionCode)}` : ""}`} className="border border-[#F97316]/50 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-[#F97316]">Relancer depuis la taxonomie</Link>
                  {selected.status !== "ARCHIVED" && selected.status !== "RUNNING" && <ArchiveProactiveSearchButton searchId={selected.id} />}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="border border-white/10 p-3"><p className="text-[9px] uppercase text-white/35">Résultats</p><p className="mt-2 text-xl text-white">{selected.results.length}</p></div>
                <div className="border border-white/10 p-3"><p className="text-[9px] uppercase text-white/35">Classés</p><p className="mt-2 text-xl text-emerald-300">{selected.results.filter((result) => result.status === "CLASSIFIED_AFTER_NOTIFICATION").length}</p></div>
                <div className="border border-white/10 p-3"><p className="text-[9px] uppercase text-white/35">À qualifier</p><p className="mt-2 text-xl text-[#F97316]">{selected.results.filter((result) => result.status === "TO_QUALIFY").length}</p></div>
              </div>

              <div className="mt-5">
                <h3 className="text-[10px] uppercase tracking-[0.16em] text-white/45">Sources réellement interrogées</h3>
                <div className="mt-2 space-y-2">
                  {sourceRows.map((source, index) => (
                    <div key={String(source.sourceUrl || index)} className="border border-white/10 bg-[#080808] p-3">
                      <p className="break-all text-xs text-white/65">{String(source.sourceUrl || "Source non identifiée")}</p>
                      <p className="mt-1 text-[10px] text-white/35">{String(source.fetched || 0)} résultat(s) · {String(source.created || 0)} nouveau(x) · {String(source.updated || 0)} actualisé(s)</p>
                      {source.error ? <p className="mt-1 text-xs text-red-200">Erreur : {String(source.error)}</p> : null}
                    </div>
                  ))}
                  {sourceRows.length === 0 && <p className="text-xs text-white/35">Aucune information de source disponible.</p>}
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <h3 className="text-[10px] uppercase tracking-[0.16em] text-white/45">Profils découverts</h3>
                {selected.results.map((result) => (
                  <article key={result.id} className="border border-white/10 bg-[#080808] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm text-white/85">{result.sourcedCandidate.headline || result.sourcedCandidate.name || "Profil public sans intitulé"}</p>
                        <p className="mt-1 text-xs text-white/40">{result.sourcedCandidate.location || "Localisation non renseignée"} · {result.source}</p>
                        <p className="mt-2 text-[10px] text-white/35">CV : {result.cvStatus === "ANALYZED" ? "analysé localement" : result.cvStatus === "NOT_PROVIDED" ? "non fourni par la source" : "non analysé — vérification nécessaire"}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm text-[#F97316]">{result.score ?? "—"}/100</p>
                        <p className="mt-1 text-[9px] uppercase text-white/35">{result.confidence} · {result.status}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-white/55">{result.rationale}</p>
                    {result.primaryProfessionCode && <p className="mt-2 text-[10px] text-emerald-300">Dossier métier : {result.primarySectorCode} / {result.primaryProfessionCode}</p>}
                    {result.status === "TO_QUALIFY" && <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-[#F97316]">À qualifier — aucun classement forcé</p>}
                    {result.sourcedCandidate.sourceProfileUrl?.startsWith("https://") && <a href={result.sourcedCandidate.sourceProfileUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block border border-white/15 px-3 py-2 text-[10px] text-white/60">Ouvrir la source publique ↗</a>}
                  </article>
                ))}
                {selected.results.length === 0 && <p className="border border-dashed border-white/15 p-6 text-sm text-white/40">Aucun profil correspondant dans cette exécution.</p>}
              </div>
            </>
          ) : (
            <div className="flex min-h-72 flex-col items-center justify-center text-center">
              <p className="font-serif text-xl text-white">Sélectionne une recherche</p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-white/40">L'historique conserve les critères, le statut, les sources réellement interrogées et les résultats. Les profils incertains restent à qualifier.</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
