import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";

export default async function SourcingQualificationPage() {
  const session = await auth();
  if (!session?.user?.id || !["OWNER", "ADMIN", "CONSULTANT"].includes(session.user.role || "")) redirect("/connexion");
  const fallback = session.user.role === "ADMIN" ? "/espace/admin" : session.user.role === "CONSULTANT" ? "/espace/consultant" : "/espace";
  if (!(await hasPermission(session.user.id, session.user.role, "SOURCING"))) redirect(fallback);
  const candidates = await prisma.sourcedCandidate.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, name: true, headline: true, location: true, skills: true, status: true, matchingScore: true, source: true } });
  return <section className="mx-auto w-[min(1280px,calc(100%-40px))] py-12 md:py-20">
    <p className="text-[10px] uppercase tracking-[0.35em] text-white/45">03 · Qualification</p>
    <h1 className="mt-3 font-serif text-4xl text-white">Qualification des profils</h1>
    <p className="mt-4 max-w-3xl text-sm leading-7 text-white/50">Visualisez les profils réellement présents dans le sourcing, avec statut, compétences, provenance et score lorsqu'un matching existe.</p>
    <div className="mt-10 overflow-hidden border border-white/10"><div className="hidden grid-cols-[2fr_1.2fr_1.6fr_1fr_1fr] border-b border-white/10 bg-[#111] px-5 py-4 text-[10px] uppercase tracking-[0.15em] text-white/35 md:grid"><span>Profil</span><span>Localisation</span><span>Compétences</span><span>Statut</span><span>Score</span></div><div className="divide-y divide-white/10">
      {candidates.map((candidate) => <article key={candidate.id} className="grid gap-3 px-5 py-5 md:grid-cols-[2fr_1.2fr_1.6fr_1fr_1fr] md:items-center"><div><p className="text-sm text-white/85">{candidate.headline || candidate.name || "Profil découvert"}</p><p className="mt-1 text-xs text-white/35">{candidate.name || "Nom non renseigné"} · {candidate.source}</p></div><p className="text-xs text-white/55">{candidate.location || "—"}</p><div className="flex flex-wrap gap-1">{Array.isArray(candidate.skills) && candidate.skills.length ? (candidate.skills as string[]).slice(0,5).map((skill) => <span key={skill} className="border border-white/10 px-2 py-1 text-[10px] text-white/55">{skill}</span>) : <span className="text-xs text-white/30">—</span>}</div><span className="w-fit border border-white/15 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-white/55">{candidate.status}</span><span className="font-serif text-xl text-[#c7a15a]">{candidate.matchingScore ?? "—"}{candidate.matchingScore !== null ? "/100" : ""}</span></article>)}
      {!candidates.length ? <p className="px-5 py-12 text-center text-sm text-white/35">Aucun profil sourcé pour le moment.</p> : null}
    </div></div>
  </section>;
}
