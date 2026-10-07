import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

const labels: Record<string,string>={SUBMITTED:"Candidature envoyée",REVIEWING:"En étude",INTERVIEW:"Entretien",SHORTLISTED:"Présenté à l'entreprise",REJECTED:"Non retenue",HIRED:"Recruté"};

export default async function CandidaturesPage(){
 const session=await auth();
 if(!session?.user?.id || session.user.role!=="CANDIDAT") redirect("/espace");
 const profile=await prisma.candidateProfile.findUnique({where:{userId:session.user.id}});
 const applications=profile?await prisma.application.findMany({where:{candidateId:profile.id,userId:session.user.id},select:{id:true,status:true,createdAt:true,updatedAt:true},orderBy:{updatedAt:"desc"}}):[];
 return <section className="mx-auto w-[min(1180px,calc(100%-40px))] py-12 md:w-[min(1180px,calc(100%-72px))]"><p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Espace candidat · Dossiers</p><h1 className="mt-4 font-serif text-4xl sm:text-5xl">Mes candidatures.</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-white/50">Chaque dossier est présenté avec son état réel et son historique de mise à jour. Les informations sensibles des entreprises restent protégées.</p><Link href="/espace/candidat" className="mt-6 inline-block border border-white/15 px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] text-white/60">← Retour</Link><div className="mt-10 space-y-3">{applications.length===0?<div className="border border-white/10 p-6 text-sm text-white/45">Aucune candidature enregistrée.</div>:applications.map(app=><article key={app.id} className="border border-white/10 bg-[#111] p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-serif text-xl">Dossier Recrutement Privé</p><p className="mt-1 text-xs text-white/35">Référence · {app.id.slice(-8).toUpperCase()}</p></div><span className="border border-[#c7a15a]/30 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[#c7a15a]">{labels[app.status]??app.status}</span></div><p className="mt-4 text-xs text-white/40">Créé le {app.createdAt.toLocaleDateString("fr-FR")} · Mis à jour le {app.updatedAt.toLocaleDateString("fr-FR")}</p></article>)}</div></section>
}