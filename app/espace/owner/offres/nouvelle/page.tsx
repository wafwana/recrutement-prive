import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { processOwnerRawOffer } from "./raw-actions";
import { createOwnerJob } from "./actions";

async function submitRaw(formData: FormData) { "use server"; await processOwnerRawOffer(formData); }
async function submitManual(formData: FormData) { "use server"; await createOwnerJob(formData); }

export default async function NewOwnerJobPage({searchParams}:{searchParams:Promise<{externalJobId?:string;sourceUrl?:string}>}) {
 const session=await auth();if(!session?.user?.id||session.user.role!=="OWNER")redirect("/connexion");
 const params=await searchParams;
 return <main className="mx-auto w-[min(1100px,calc(100%-40px))] py-12 md:py-20">
  <div className="flex flex-wrap items-center justify-between gap-4">
   <div><p className="text-[10px] uppercase tracking-[0.3em] text-[#c7a15a]">OWNER · IA sourcing</p>
   <h1 className="mt-3 font-serif text-4xl">Rentrer une offre</h1>
   <p className="mt-3 max-w-3xl text-sm leading-7 text-white/50">Vous trouvez une offre, vous la donnez à Recrutement Privé. L'IA structure l'offre, identifie l'entreprise, enrichit les données publiques disponibles, classe le besoin, analyse les postes difficiles, lance le matching et prépare le premier contact.</p></div>
   <Link href="/espace/owner/offres-vivier" className="border border-white/10 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-white/55">Retour au vivier</Link>
  </div>
  <form action={submitRaw} className="mt-10 grid gap-5 border border-[#F97316]/30 bg-[#111] p-7">
   {params.externalJobId&&<input type="hidden" name="externalJobId" value={params.externalJobId}/>}
   <div className="border border-[#F97316]/20 bg-[#F97316]/5 p-5"><p className="text-[10px] uppercase tracking-[0.18em] text-[#F97316]">Chaîne automatique</p>
   <p className="mt-3 text-sm leading-6 text-white/65">Offre brute → analyse IA → entreprise → classification → postes difficiles → candidats compatibles → courrier personnalisé → contact, uniquement si une adresse exploitable existe et si l'envoi automatique est activé.</p></div>
   <label className="text-xs text-white/50">URL de l'offre
    <input name="sourceUrl" defaultValue={params.sourceUrl||""} placeholder="https://..." className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none"/>
   </label>
   <label className="text-xs text-white/50">Ou collez l'offre complète
    <textarea name="rawText" rows={14} maxLength={30000} placeholder="Collez ici le texte de l'offre. L'IA se charge du reste." className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none"/>
   </label>
   <label className="text-xs text-white/50">Ou fournissez un fichier texte
    <input name="offerFile" type="file" accept=".txt,.html,.htm,.json,text/plain,text/html,application/json" className="mt-2 block w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white/60"/>
    <span className="mt-2 block text-[10px] text-white/30">TXT, HTML ou JSON pour cette première version. L'original reste traité comme source et l'opération est journalisée.</span>
   </label>
   <div className="flex items-center justify-between gap-4">
    <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">OWNER · isolation · audit · vivier CV protégé</p>
    <button className="border border-[#c7a15a] px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-[#c7a15a]">Analyser et rentrer l'offre</button>
   </div>
  </form>
  <details className="mt-8 border border-white/10 bg-[#111] p-6">
   <summary className="cursor-pointer text-[10px] uppercase tracking-[0.18em] text-white/45">Saisie manuelle classique</summary>
   <form action={submitManual} className="mt-6 grid gap-4">
    <input name="companyId" placeholder="ID entreprise existante" required className="border border-white/10 bg-transparent px-4 py-3 text-sm"/>
    <input name="title" placeholder="Intitulé du poste" required className="border border-white/10 bg-transparent px-4 py-3 text-sm"/>
    <textarea name="description" rows={8} placeholder="Contenu de l'offre" required className="border border-white/10 bg-transparent px-4 py-3 text-sm"/>
    <select name="status" defaultValue="DRAFT" className="border border-white/10 bg-[#111] px-4 py-3 text-sm"><option value="DRAFT">Brouillon</option><option value="OPEN">Ouverte</option><option value="PAUSED">En pause</option></select>
    <button className="justify-self-end border border-white/20 px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-white/60">Enregistrer manuellement</button>
   </form>
  </details>
 </main>;
}
