import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";

export default async function SourcingMatchingPage() {
  const session = await auth();
  if (!session?.user?.id || !["OWNER", "ADMIN", "CONSULTANT"].includes(session.user.role || "")) redirect("/connexion");
  const fallback = session.user.role === "ADMIN" ? "/espace/admin" : session.user.role === "CONSULTANT" ? "/espace/consultant" : "/espace";
  if (!(await hasPermission(session.user.id, session.user.role, "SOURCING"))) redirect(fallback);
  const candidates = await prisma.sourcedCandidate.findMany({ where: { matchingScore: { not: null } }, orderBy: [{ matchingScore: "desc" }], take: 100, select: { id: true, name: true, headline: true, location: true, skills: true, matchingScore: true, source: true } });
  const average = candidates.length ? Math.round(candidates.reduce((sum, c) => sum + (c.matchingScore || 0), 0) / candidates.length) : null;
  return <section className="mx-auto w-[min(1280px,calc(100%-40px))] py-12 md:py-20">
    <p className="text-[10px] uppercase tracking-[0.35em] text-[#F97316]">04 · Matching</p>
    <h1 className="mt-3 font-serif text-4xl text-white">Correspondances candidats ↔ offres</h1>
    <p className="mt-4 max-w-3xl text-sm leading-7 text-white/50">Visualisez les profils pour lesquels le moteur a déjà calculé une correspondance. Le score priorise l'analyse humaine et ne déclenche aucune prise de contact automatique.</p>
    <div className="mt-10 grid gap-4 md:grid-cols-3"><div className="border border-[#F97316]/30 bg-[#111] p-5"><p className="text-[10px] uppercase tracking-[0.15em] text-white/35">Profils matchés</p><p className="mt-2 font-serif text-3xl text-[#F97316]">{candidates.length}</p></div><div className="border border-white/10 bg-[#111] p-5"><p className="text-[10px] uppercase tracking-[0.15em] text-white/35">Score moyen</p><p className="mt-2 font-serif text-3xl text-white">{average ?? "—"}{average !== null ? "/100" : ""}</p></div><div className="border border-white/10 bg-[#111] p-5"><p className="text-[10px] uppercase tracking-[0.15em] text-white/35">Validation humaine</p><p className="mt-2 text-sm text-white/55">Obligatoire avant toute action externe.</p></div></div>
    <div className="mt-8 space-y-3">{candidates.map((candidate) => <article key={candidate.id} className="border border-white/10 bg-[#111] p-5"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><p className="font-serif text-xl text-white">{candidate.headline || candidate.name || "Profil découvert"}</p><p className="mt-1 text-xs text-white/40">{candidate.location || "Localisation non précisée"} · source {candidate.source}</p><div className="mt-3 flex flex-wrap gap-1">{Array.isArray(candidate.skills) ? (candidate.skills as string[]).slice(0,6).map((skill) => <span key={skill} className="border border-white/10 px-2 py-1 text-[10px] text-white/55">{skill}</span>) : null}</div></div><div className="min-w-28 border border-[#F97316]/40 px-5 py-3 text-center"><p className="font-serif text-3xl text-[#F97316]">{candidate.matchingScore}</p><p className="text-[9px] uppercase tracking-[0.16em] text-white/35">score /100</p></div></div></article>)}{!candidates.length ? <p className="border border-white/10 p-8 text-center text-sm text-white/35">Aucune correspondance calculée pour le moment.</p> : null}</div>
  </section>;
}
