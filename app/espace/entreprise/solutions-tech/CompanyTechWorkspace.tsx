"use client";

import { useState, type FormEvent } from "react";

type Project = { id: string; reference: string; name: string; status: string; description: string | null; proposal: { title: string; status: string } | null; milestones: { id: string; title: string; status: string; dueAt: string | null }[] };
type RequestItem = { id: string; projectNeed: string | null; notes: string | null; status: string; createdAt: string };

const serviceLabels: Record<string, string> = {
  SITE_WEB: "Site web", E_COMMERCE: "Site e-commerce", SAAS: "Plateforme SaaS",
  CRM: "CRM / outil de gestion", PORTAIL: "Portail client ou partenaire",
  APPLICATION_METIER: "Application métier sur mesure", INTEGRATION: "Intégration / automatisation", AUTRE: "Autre besoin",
};

export default function CompanyTechWorkspace({ companyId, requests, projects }: { companyId: string; requests: RequestItem[]; projects: Project[] }) {
  const [serviceType, setServiceType] = useState("SITE_WEB");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setError("");
    try {
      const response = await fetch("/api/tech/client-requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, serviceType, description }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Demande impossible.");
      setMessage(result.message || "Demande transmise."); setDescription("");
      window.location.reload();
    } catch (e) { setError(e instanceof Error ? e.message : "Une erreur est survenue."); }
    finally { setBusy(false); }
  }

  return <div className="mx-auto max-w-6xl space-y-10">
    <header className="border border-white/10 bg-[radial-gradient(ellipse_at_top_right,_rgba(199,161,90,0.16),_transparent_50%),#0d1d2b] p-8 sm:p-10">
      <p className="text-[10px] uppercase tracking-[0.24em] text-[#c7a15a]">Pôle 2 · Espace client</p>
      <h1 className="mt-4 max-w-3xl font-serif text-3xl sm:text-4xl">Vos solutions technologiques</h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60">Présentez vos besoins numériques et retrouvez ici l'avancement de vos demandes et projets.</p>
      <a href="/espace/entreprise" className="mt-6 inline-block border border-white/20 px-4 py-2 text-xs text-white/75">← Retour à votre espace entreprise</a>
    </header>
    <section className="grid gap-8 lg:grid-cols-[.9fr_1.1fr]">
      <form onSubmit={submit} className="space-y-4 border border-white/10 p-6">
        <div><p className="text-[10px] uppercase tracking-[.2em] text-[#c7a15a]">Nouvelle demande</p><h2 className="mt-2 font-serif text-2xl">Décrivez votre projet</h2></div>
        <label className="block text-xs text-white/60">Type de prestation
          <select value={serviceType} onChange={e=>setServiceType(e.target.value)} className="mt-2 w-full border border-white/15 bg-[#081625] px-3 py-3 text-sm text-white">
            {Object.entries(serviceLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label className="block text-xs text-white/60">Votre besoin
          <textarea required minLength={10} maxLength={5000} rows={7} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Présentez votre activité, votre besoin, les utilisateurs concernés et le résultat attendu…" className="mt-2 w-full border border-white/15 bg-[#081625] px-3 py-3 text-sm text-white"/>
        </label>
        {error&&<p role="alert" className="text-sm text-red-300">{error}</p>}
        {message&&<p role="status" className="text-sm text-green-300">{message}</p>}
        <button disabled={busy} className="bg-[#c7a15a] px-5 py-3 text-sm font-semibold text-[#081625] disabled:opacity-50">{busy?"Envoi…":"Transmettre ma demande"}</button>
        <p className="text-[11px] leading-5 text-white/35">Votre demande est transmise à l'équipe Pôle 2. Aucun engagement ni démarchage externe n'est déclenché automatiquement.</p>
      </form>
      <div className="space-y-8">
        <section><h2 className="font-serif text-2xl">Vos demandes</h2><div className="mt-4 space-y-2">{requests.length?requests.map(item=><article key={item.id} className="border border-white/10 p-4"><div className="flex flex-wrap justify-between gap-2"><strong className="text-sm">{serviceLabels[item.projectNeed||""]||item.projectNeed||"Demande technologique"}</strong><span className="text-[10px] uppercase text-[#c7a15a]">{item.status.replaceAll("_"," ")}</span></div><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-white/55">{item.notes}</p><p className="mt-3 text-[10px] text-white/35">{new Date(item.createdAt).toLocaleDateString("fr-FR")}</p></article>):<p className="border border-white/10 p-5 text-sm text-white/40">Aucune demande pour le moment.</p>}</div></section>
        <section><h2 className="font-serif text-2xl">Vos projets</h2><div className="mt-4 space-y-3">{projects.length?projects.map(project=><article key={project.id} className="border border-white/10 p-5"><div className="flex flex-wrap justify-between gap-2"><strong>{project.name}</strong><span className="text-[10px] uppercase text-[#c7a15a]">{project.status.replaceAll("_"," ")}</span></div><p className="mt-1 text-[10px] text-white/35">{project.reference}</p>{project.description&&<p className="mt-3 text-sm text-white/55">{project.description}</p>}{project.proposal&&<p className="mt-3 text-xs text-white/60">Proposition : {project.proposal.title} · {project.proposal.status}</p>}{project.milestones.length>0&&<ul className="mt-4 space-y-2 border-t border-white/10 pt-3">{project.milestones.map(m=><li key={m.id} className="flex justify-between gap-3 text-xs text-white/55"><span>{m.title}</span><span>{m.status.replaceAll("_"," ")}</span></li>)}</ul>}</article>):<p className="border border-white/10 p-5 text-sm text-white/40">Vos projets apparaîtront ici après leur lancement.</p>}</div></section>
      </div>
    </section>
  </div>;
}
