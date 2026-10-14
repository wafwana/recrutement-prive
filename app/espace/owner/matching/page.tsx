import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import BackButton from "@/components/navigation/BackButton";

type StoredMatch = {
  candidateId?: string;
  candidateType?: "PLATFORM_CANDIDATE" | "SOURCED_CANDIDATE";
  score?: number;
  matchedSkills?: string[];
  missingSkills?: string[];
  reasons?: string[];
};

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export default async function OwnerMatchingPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const role = session?.user?.role;
  if (!userId || !["OWNER", "ADMIN", "CONSULTANT"].includes(role || "")) redirect("/connexion");
  if (!(await hasPermission(userId, role, "OFFRES_VIVIER"))) {
    redirect(role === "ADMIN" ? "/espace/admin" : role === "CONSULTANT" ? "/espace/consultant" : "/espace");
  }

  const offers = await prisma.externalJobOpportunity.findMany({
    where: { status: "MATCHING" },
    orderBy: [{ updatedAt: "desc" }],
    take: 200,
    select: { id: true, title: true, companyName: true, country: true, city: true, categoryCode: true, subCategoryCode: true, rawData: true, updatedAt: true },
  });

  const parsed = offers.map((offer) => {
    const raw = asObject(offer.rawData);
    const matching = asObject(raw?.matching);
    const matches = Array.isArray(matching?.topMatches) ? matching.topMatches as StoredMatch[] : [];
    return { offer, matches };
  });
  const platformIds = [...new Set(parsed.flatMap(({ matches }) => matches.filter((m) => m.candidateType === "PLATFORM_CANDIDATE" && m.candidateId).map((m) => m.candidateId as string)))];
  const sourcedIds = [...new Set(parsed.flatMap(({ matches }) => matches.filter((m) => m.candidateType === "SOURCED_CANDIDATE" && m.candidateId).map((m) => m.candidateId as string)))];

  const [platformCandidates, sourcedCandidates] = await Promise.all([
    platformIds.length ? prisma.candidateProfile.findMany({
      where: { id: { in: platformIds } },
      select: { id: true, headline: true, country: true, location: true, experienceYears: true, user: { select: { name: true } } },
    }) : Promise.resolve([]),
    sourcedIds.length ? prisma.sourcedCandidate.findMany({
      where: { id: { in: sourcedIds } },
      select: { id: true, name: true, headline: true, location: true, experienceYears: true, status: true },
    }) : Promise.resolve([]),
  ]);
  const platformById = new Map(platformCandidates.map((candidate) => [candidate.id, candidate]));
  const sourcedById = new Map(sourcedCandidates.map((candidate) => [candidate.id, candidate]));

  return (
    <section className="mx-auto w-[min(1400px,calc(100%-40px))] py-10 md:py-16">
      <BackButton />
      <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#c7a15a]">Owner · Correspondances</p>
          <h1 className="mt-3 font-serif text-4xl sm:text-5xl">Candidats ↔ entreprises</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/55">Chaque fiche relie une offre à son entreprise et aux profils les mieux classés. Le score est une aide au tri, pas une décision automatique de recrutement. Les profils sourcés restent internes et ne sont pas contactés automatiquement.</p>
        </div>
        <Link href="/espace/owner/offres-vivier" className="border border-[#F97316] px-4 py-3 text-xs uppercase tracking-wider text-[#F97316]">Retour au Vivier</Link>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="border border-white/10 bg-[#111] p-5"><p className="text-xs text-white/45">Offres avec rapprochement</p><p className="mt-2 font-serif text-3xl text-[#c7a15a]">{parsed.length}</p></div>
        <div className="border border-white/10 bg-[#111] p-5"><p className="text-xs text-white/45">Candidats internes proposés</p><p className="mt-2 font-serif text-3xl text-[#c7a15a]">{new Set(parsed.flatMap(({matches}) => matches.filter(m => m.candidateType === "PLATFORM_CANDIDATE").map(m => m.candidateId).filter(Boolean))).size}</p></div>
        <div className="border border-white/10 bg-[#111] p-5"><p className="text-xs text-white/45">Profils sourcés proposés</p><p className="mt-2 font-serif text-3xl text-[#c7a15a]">{new Set(parsed.flatMap(({matches}) => matches.filter(m => m.candidateType === "SOURCED_CANDIDATE").map(m => m.candidateId).filter(Boolean))).size}</p></div>
      </div>

      <div className="mt-8 space-y-6">
        {parsed.map(({offer, matches}) => (
          <article key={offer.id} className="overflow-hidden border border-white/10">
            <div className="border-b border-white/10 bg-[#111] p-5 md:p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#c7a15a]">Offre · {offer.categoryCode || "Métier à préciser"}{offer.subCategoryCode ? " / " + offer.subCategoryCode : ""}</p>
                  <h2 className="mt-2 text-xl text-white">{offer.title}</h2>
                  <p className="mt-2 text-sm text-white/65">{offer.companyName || "Entreprise non renseignée"}</p>
                  <p className="mt-1 text-xs text-white/40">{[offer.city, offer.country].filter(Boolean).join(", ") || "Localisation non précisée"}</p>
                </div>
                <div className="shrink-0 border border-[#c7a15a]/30 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-white/40">Profils retenus par le moteur</p>
                  <p className="mt-1 text-2xl text-[#F97316]">{matches.length}</p>
                  <p className="text-[10px] text-white/35">Dernier calcul : {offer.updatedAt.toLocaleString("fr-FR")}</p>
                </div>
              </div>
            </div>
            {matches.length ? (
              <div className="grid gap-3 p-4 md:grid-cols-2 md:p-5">
                {matches.map((match, index) => {
                  const candidate = match.candidateType === "PLATFORM_CANDIDATE"
                    ? platformById.get(match.candidateId || "")
                    : sourcedById.get(match.candidateId || "");
                  const candidateName = match.candidateType === "PLATFORM_CANDIDATE"
                    ? (platformById.get(match.candidateId || "")?.user.name || platformById.get(match.candidateId || "")?.headline || "Candidat interne")
                    : (sourcedById.get(match.candidateId || "")?.name || sourcedById.get(match.candidateId || "")?.headline || "Profil sourcé");
                  const location = match.candidateType === "PLATFORM_CANDIDATE"
                    ? [platformById.get(match.candidateId || "")?.location, platformById.get(match.candidateId || "")?.country].filter(Boolean).join(", ")
                    : sourcedById.get(match.candidateId || "")?.location || "";
                  const headline = match.candidateType === "PLATFORM_CANDIDATE"
                    ? platformById.get(match.candidateId || "")?.headline
                    : sourcedById.get(match.candidateId || "")?.headline;
                  const experience = match.candidateType === "PLATFORM_CANDIDATE"
                    ? platformById.get(match.candidateId || "")?.experienceYears
                    : sourcedById.get(match.candidateId || "")?.experienceYears;
                  const score = typeof match.score === "number" ? match.score : 0;
                  return (
                    <div key={match.candidateId || index} className="border border-white/10 bg-[#0d1117] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base text-white">{candidateName}</p>
                          <p className="mt-1 text-xs text-white/45">{headline || (match.candidateType === "SOURCED_CANDIDATE" ? "Profil externe sourcé" : "Profil de la CVthèque")}</p>
                          <p className="mt-1 text-xs text-white/35">{[location, experience !== null && experience !== undefined ? experience + " an(s) d’expérience" : null].filter(Boolean).join(" · ") || "Informations complémentaires indisponibles"}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-2xl font-semibold text-[#F97316]">{score}%</p>
                          <p className="text-[9px] uppercase tracking-wider text-white/35">Compatibilité</p>
                        </div>
                      </div>
                      <div className="mt-4 h-1.5 overflow-hidden bg-white/10"><div className="h-full bg-[#F97316]" style={{width: score + "%"}} /></div>
                      <div className="mt-4">
                        <p className="text-[10px] uppercase tracking-wider text-white/40">Compétences correspondantes</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {asStringArray(match.matchedSkills).length ? asStringArray(match.matchedSkills).map(skill => <span key={skill} className="border border-emerald-500/30 px-2 py-1 text-[10px] text-emerald-300">{skill}</span>) : <span className="text-xs text-white/35">Aucune compétence commune confirmée</span>}
                        </div>
                      </div>
                      {asStringArray(match.missingSkills).length > 0 && <p className="mt-3 text-xs text-amber-200/70">À vérifier : {asStringArray(match.missingSkills).join(", ")}</p>}
                      <div className="mt-4 border-t border-white/10 pt-3">
                        <p className="text-[10px] uppercase tracking-wider text-white/40">Pourquoi ce profil ?</p>
                        <ul className="mt-2 space-y-1">{asStringArray(match.reasons).map((reason, i) => <li key={i} className="text-xs leading-5 text-white/55">• {reason}</li>)}</ul>
                      </div>
                      <p className="mt-4 text-[9px] uppercase tracking-wider text-white/30">{match.candidateType === "SOURCED_CANDIDATE" ? "Sourcing externe · validation humaine requise" : "CVthèque interne · validation humaine requise"}</p>
                      {!candidate && <p className="mt-2 text-xs text-amber-200/70">Le profil a changé ou n’est plus disponible ; relancer le matching pour actualiser cette fiche.</p>}
                    </div>
                  );
                })}
              </div>
            ) : <p className="p-6 text-sm text-white/45">Aucun profil ne dépasse actuellement le seuil de rapprochement. Vérifie les critères de l’offre et les profils disponibles.</p>}
            <div className="border-t border-white/10 px-5 py-3 text-xs text-white/35">Le moteur conserve jusqu’à 20 profils par offre à partir d’un score minimal de 25/100. Vérifie les compétences, l’expérience et le contexte avant de valider une présentation.</div>
          </article>
        ))}
        {!parsed.length && <div className="border border-white/10 p-10 text-center"><h2 className="text-xl text-white">Aucun matching enregistré pour le moment</h2><p className="mt-2 text-sm text-white/45">Qualifie les offres puis lance le traitement par lots dans le Vivier. Les résultats apparaîtront ici après le calcul.</p><Link href="/espace/owner/offres-vivier" className="mt-5 inline-block border border-[#F97316] px-4 py-3 text-xs text-[#F97316]">Ouvrir le Vivier des offres</Link></div>}
      </div>
    </section>
  );
}
