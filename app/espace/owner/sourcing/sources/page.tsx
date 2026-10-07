import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getConfiguredSourcesAsync } from "@/lib/sourcing/global";

export default async function SourcingSourcesPage() {
  const session = await auth();
  if (!session?.user?.id || !["OWNER", "ADMIN", "CONSULTANT"].includes(session.user.role || "")) redirect("/connexion");
  const fallback = session.user.role === "ADMIN" ? "/espace/admin" : session.user.role === "CONSULTANT" ? "/espace/consultant" : "/espace";
  if (!(await hasPermission(session.user.id, session.user.role, "SOURCING"))) redirect(fallback);
  const [candidateSources, jobSources] = await Promise.all([
    getConfiguredSourcesAsync("RP_GLOBAL_CANDIDATE_SOURCES"),
    getConfiguredSourcesAsync("RP_GLOBAL_JOB_SOURCES"),
  ]);
  return <section className="mx-auto w-[min(1180px,calc(100%-40px))] py-12 md:py-20">
    <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">01 · Sources</p>
    <h1 className="mt-3 font-serif text-4xl text-white">Sources autorisées</h1>
    <p className="mt-4 max-w-3xl text-sm leading-7 text-white/50">Visualisez les origines réellement configurées pour alimenter le sourcing RP.</p>
    <div className="mt-10 grid gap-6 md:grid-cols-2">
      <article className="border border-white/10 bg-[#111] p-6"><div className="flex items-center justify-between"><h2 className="font-serif text-2xl text-white">Sources candidats</h2><span className="text-xs text-[#c7a15a]">{candidateSources.length} active(s)</span></div><div className="mt-5 space-y-2">{candidateSources.length ? candidateSources.map((source) => <div key={source} className="break-all border border-white/10 bg-black/20 p-3 font-mono text-xs text-white/65">{source}</div>) : <p className="text-sm text-white/35">Aucune source candidat active.</p>}</div></article>
      <article className="border border-white/10 bg-[#111] p-6"><div className="flex items-center justify-between"><h2 className="font-serif text-2xl text-white">Sources offres</h2><span className="text-xs text-[#F97316]">{jobSources.length} active(s)</span></div><div className="mt-5 space-y-2">{jobSources.length ? jobSources.map((source) => <div key={source} className="break-all border border-white/10 bg-black/20 p-3 font-mono text-xs text-white/65">{source}</div>) : <p className="text-sm text-white/35">Aucune source d'offre active.</p>}</div></article>
    </div>
  </section>;
}
