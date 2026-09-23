import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import BackButton from "@/components/navigation/BackButton";

const statusLabels: Record<string,string> = { DETECTED:"Nouvelle", A_QUALIFIER:"À qualifier", QUALIFIED:"Qualifiée", MATCHING:"En matching", FILLED:"Pourvue", ARCHIVED:"Archivée", REJECTED:"Écartée" };

export default async function OfferPoolPage() {
  const session = await auth(); const id = session?.user?.id; const role = session?.user?.role;
  if (!id || !["OWNER","ADMIN","CONSULTANT"].includes(role || "")) redirect("/connexion");
  if (!(await hasPermission(id, role, "OFFRES_VIVIER"))) redirect("/espace/owner");
  const [offers,total,newCount,qualifiedCount,matchingCount] = await Promise.all([
    prisma.externalJobOpportunity.findMany({ orderBy:[{publishedAt:"desc"},{createdAt:"desc"}], take:500, select:{id:true,title:true,companyName:true,country:true,city:true,categoryCode:true,subCategoryCode:true,source:true,sourceUrl:true,publishedAt:true,salary:true,status:true} }),
    prisma.externalJobOpportunity.count(), prisma.externalJobOpportunity.count({where:{status:"A_QUALIFIER"}}), prisma.externalJobOpportunity.count({where:{status:"QUALIFIED"}}), prisma.externalJobOpportunity.count({where:{status:"MATCHING"}}),
  ]);
  const countries=[...new Set(offers.map(o=>o.country).filter(Boolean) as string[])].sort();
  return (<section className="mx-auto w-[min(1400px,calc(100%-40px))] py-12 md:py-20">
    <BackButton />
    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div><p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Owner · Vivier des offres</p><h1 className="mt-4 font-serif text-4xl sm:text-5xl">Vivier des offres.</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-white/50">Toutes les offres collectées par le sourcing ou ajoutées manuellement, conservées en interne pour qualification, classement et matching. Aucune offre détaillée n’est exposée publiquement.</p></div><Link href="/espace/owner/sourcing" className="border border-[#F97316] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#F97316]">Lancer / voir le sourcing</Link></div>
    <div className="mt-8 grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4">{[["Offres conservées",total],["À qualifier",newCount],["Qualifiées",qualifiedCount],["En matching",matchingCount]].map(([l,v])=><div key={String(l)} className="bg-[#111] p-5"><p className="text-[10px] uppercase tracking-[0.16em] text-white/35">{l}</p><p className="mt-2 font-serif text-3xl text-[#c7a15a]">{v}</p></div>)}</div>
    <form method="get" className="mt-8 grid gap-3 border border-white/10 p-5 md:grid-cols-[2fr_1fr_1fr_auto]"><input name="q" placeholder="Rechercher titre, entreprise, ville, métier…" className="border border-white/10 bg-transparent px-4 py-3 text-sm outline-none" /><select name="status" className="border border-white/10 bg-[#111] px-4 py-3 text-sm"><option value="">Tous les statuts</option>{Object.entries(statusLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><select name="country" className="border border-white/10 bg-[#111] px-4 py-3 text-sm"><option value="">Tous les pays</option>{countries.map(c=><option key={c} value={c}>{c}</option>)}</select><button className="border border-[#c7a15a] px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-[#c7a15a]">Rechercher</button></form>
    <div className="mt-8 overflow-hidden border border-white/10"><div className="grid grid-cols-1 border-b border-white/10 bg-[#111] px-5 py-4 text-[10px] uppercase tracking-[0.16em] text-white/35] md:grid-cols-[2fr_1.1fr_1fr_1fr_1fr]"><span>Offre</span><span>Entreprise</span><span>Localisation</span><span>Métier</span><span>État / source</span></div>{offers.map(o=><article key={o.id} className="grid grid-cols-1 gap-3 border-b border-white/10 px-5 py-5 last:border-b-0 md:grid-cols-[2fr_1.1fr_1fr_1fr_1fr] md:items-center"><div><p className="text-sm text-white/85">{o.title}</p>{o.salary&&<p className="mt-1 text-xs text-white/35">{o.salary}</p>}</div><p className="text-xs text-white/55">{o.companyName||"Entreprise non renseignée"}</p><p className="text-xs text-white/55">{[o.city,o.country].filter(Boolean).join(", ")||"—"}</p><p className="text-xs text-white/55">{o.categoryCode||"À qualifier"}{o.subCategoryCode?" · "+o.subCategoryCode:""}</p><div><p className="text-xs text-[#c7a15a]">{statusLabels[o.status]||o.status}</p><p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/30">{o.source}</p>{o.sourceUrl&&<a href={o.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[10px] text-[#F97316] hover:underline">Source</a>}</div></article>)}{!offers.length&&<div className="px-5 py-12 text-center text-sm text-white/35">Aucune offre dans le vivier.</div>}</div>
  </section>);
}