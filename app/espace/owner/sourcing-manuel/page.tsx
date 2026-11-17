import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import BackButton from "@/components/navigation/BackButton";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
function one(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function stringIds(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export default async function ManualSourcingFoldersPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session?.user?.id || !["OWNER", "ADMIN", "CONSULTANT"].includes(session.user.role || "")) redirect("/connexion");
  const fallback = session.user.role === "ADMIN" ? "/espace/admin" : session.user.role === "CONSULTANT" ? "/espace/consultant" : "/espace";
  if (!(await hasPermission(session.user.id, session.user.role, "SOURCING")) ||
      !(await hasPermission(session.user.id, session.user.role, "METIERS_DOSSIERS"))) redirect(fallback);

  const params = await searchParams;
  const selectedId = one(params.id) || "";
  const where = session.user.role === "OWNER" ? {} : { createdByUserId: session.user.id };
  const [candidateSearches, offerSearches, selectedOffer] = await Promise.all([
    prisma.proactiveSearch.findMany({
      where, orderBy: { createdAt: "desc" }, take: 100,
      select: { id: true, title: true, sectorCode: true, professionCode: true, query: true, country: true, status: true, createdAt: true, _count: { select: { results: true } } },
    }),
    prisma.offerSourcingSearch.findMany({
      where, orderBy: { createdAt: "desc" }, take: 100,
      select: { id: true, title: true, criteria: true, country: true, status: true, sourceSummary: true, resultIds: true, lastError: true, createdAt: true },
    }),
    selectedId ? prisma.offerSourcingSearch.findFirst({ where: { id: selectedId, ...where } }) : Promise.resolve(null),
  ]);
  const selectedSummary = asRecord(selectedOffer?.sourceSummary);
  const selectedIds = stringIds(selectedOffer?.resultIds);
  const selectedOffers = selectedIds.length ? await prisma.externalJobOpportunity.findMany({
    where: { id: { in: selectedIds } },
    orderBy: { sourceCollectedAt: "desc" },
    select: { id: true, title: true, companyName: true, country: true, city: true, source: true, sourceUrl: true, status: true, closingAt: true },
  }) : [];

  return (
    <section className="mx-auto w-[min(1280px,calc(100%-32px))] py-10 md:w-[min(1280px,calc(100%-72px))] md:py-16">
      <BackButton fallback="/espace/owner" />
      <div className="flex flex-col gap-4 border-b border-white/10 pb-7 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#F97316]">Sourcing manuel · Dossiers permanents</p>
          <h1 className="mt-3 font-serif text-4xl text-white md:text-5xl">Mes recherches ciblées</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/50">Chaque lancement conserve ses critères, sa date, ses sources, son statut et ses résultats. Les CV et annonces d'origine restent dans leurs espaces habituels ; ces dossiers sont des regroupements virtuels.</p>
        </div>
        <Link href="/espace/owner/metiers" className="border border-[#F97316]/50 bg-[#F97316]/10 px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-[#F97316]">Nouvelle recherche</Link>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <section className="border border-white/10 bg-[#111] p-4 md:p-5">
          <div className="flex items-center justify-between"><h2 className="font-serif text-xl text-white">Recherches candidats</h2><span className="text-xs text-white/35">{candidateSearches.length}</span></div>
          <div className="mt-4 space-y-2">
            {candidateSearches.map((item) => (
              <Link key={item.id} href={`/espace/owner/recherche-proactive?id=${item.id}`} className="block border border-white/10 bg-black/30 p-4 hover:border-[#F97316]/50">
                <div className="flex items-center justify-between gap-3"><p className="text-sm text-white/85">{item.title}</p><span className="text-[9px] uppercase text-[#F97316]">{item.status}</span></div>
                <p className="mt-2 text-[10px] text-white/40">{item.query || item.professionCode || item.sectorCode}{item.country ? ` · ${item.country}` : ""}</p>
                <p className="mt-2 text-[10px] text-white/30">{item._count.results} résultat(s) · {new Date(item.createdAt).toLocaleString("fr-FR")}</p>
              </Link>
            ))}
            {!candidateSearches.length && <p className="border border-dashed border-white/15 p-5 text-xs text-white/35">Aucune recherche candidat enregistrée.</p>}
          </div>
        </section>

        <section className="border border-white/10 bg-[#111] p-4 md:p-5">
          <div className="flex items-center justify-between"><h2 className="font-serif text-xl text-white">Recherches offres</h2><span className="text-xs text-white/35">{offerSearches.length}</span></div>
          <div className="mt-4 space-y-2">
            {offerSearches.map((item) => {
              const summary = asRecord(item.sourceSummary);
              const count = typeof summary.matched === "number" ? summary.matched : stringIds(item.resultIds).length;
              return <Link key={item.id} href={`/espace/owner/sourcing-manuel?id=${item.id}`} className={"block border p-4 " + (selectedOffer?.id === item.id ? "border-[#F97316]/60 bg-[#F97316]/5" : "border-white/10 bg-black/30 hover:border-white/25")}>
                <div className="flex items-center justify-between gap-3"><p className="text-sm text-white/85">{item.title}</p><span className="text-[9px] uppercase text-[#F97316]">{item.status}</span></div>
                <p className="mt-2 text-[10px] text-white/40">{item.country || "Tous pays"} · {count} offre(s) associée(s)</p>
                <p className="mt-2 text-[10px] text-white/30">{new Date(item.createdAt).toLocaleString("fr-FR")}</p>
              </Link>;
            })}
            {!offerSearches.length && <p className="border border-dashed border-white/15 p-5 text-xs text-white/35">Aucune recherche offre enregistrée.</p>}
          </div>
        </section>
      </div>

      {selectedOffer && (
        <section className="mt-6 border border-[#F97316]/30 bg-[#111] p-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#F97316]">Dossier sélectionné</p>
          <h2 className="mt-2 font-serif text-2xl text-white">{selectedOffer.title}</h2>
          <p className="mt-2 text-xs text-white/40">Lancement : {new Date(selectedOffer.createdAt).toLocaleString("fr-FR")} · {selectedOffer.status} · {selectedOffers.length} offre(s) retrouvée(s)</p>
          {selectedOffer.lastError && <p className="mt-3 text-xs text-red-300">{selectedOffer.lastError}</p>}
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {selectedOffers.map((offer) => <article key={offer.id} className="border border-white/10 bg-black/30 p-4">
              <p className="text-sm text-white/85">{offer.title}</p>
              <p className="mt-1 text-xs text-white/50">{offer.companyName || "Employeur non précisé"} · {[offer.city, offer.country].filter(Boolean).join(", ") || "Lieu non précisé"}</p>
              <p className="mt-2 text-[10px] text-white/35">{offer.source} · {offer.status}</p>
              {offer.sourceUrl && <a href={offer.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-[10px] text-[#F97316] underline">Consulter l’annonce source</a>}
            </article>)}
            {!selectedOffers.length && <p className="text-xs text-white/40">Aucune annonce correspondante n’a été conservée dans ce dossier.</p>}
          </div>
          <details className="mt-4 border-t border-white/10 pt-4">
            <summary className="cursor-pointer text-[10px] uppercase tracking-[0.12em] text-white/45">Critères et provenance</summary>
            <pre className="mt-3 overflow-auto whitespace-pre-wrap text-[10px] leading-5 text-white/45">{JSON.stringify({ criteria: selectedOffer.criteria, country: selectedOffer.country, sourceSummary: selectedSummary }, null, 2)}</pre>
          </details>
        </section>
      )}
    </section>
  );
}
