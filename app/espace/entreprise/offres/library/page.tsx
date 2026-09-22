"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Job = { id: string; title: string; status: string; location: string | null; folderPath: string; analyzedAt: string | null };
export default function OfferLibrary() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    fetch("/api/entreprise/offers/library" + (q ? "?q=" + encodeURIComponent(q) : ""))
      .then((r) => r.json()).then((d) => setJobs(Array.isArray(d.jobs) ? d.jobs : [])).finally(() => setLoading(false));
  }, [q]);
  return <section className="mx-auto w-[min(1180px,calc(100%-40px))] py-16">
    <Link href="/espace/entreprise" className="text-[10px] uppercase tracking-[0.2em] text-[#c7a15a]">← Retour</Link>
    <p className="mt-8 text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Bibliothèque des offres</p>
    <h1 className="mt-3 font-serif text-4xl">Retrouver et rematcher vos offres</h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">Les offres sont classées automatiquement par métier et sous-métier. Le matching peut rechercher des candidats indépendamment de l'offre ou de la source d'origine.</p>
    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher par offre ou dossier" className="mt-8 w-full border border-white/10 bg-transparent px-4 py-3 text-sm outline-none" />
    <div className="mt-8 space-y-2">{loading ? <p>Chargement…</p> : jobs.length === 0 ? <p className="border border-white/10 p-5 text-sm text-white/45">Aucune offre.</p> : jobs.map((job) => <Link key={job.id} href={"/espace/entreprise/offres/" + job.id} className="block border border-white/10 p-5 hover:border-[#c7a15a]/40"><div className="flex justify-between gap-4"><div><h2 className="font-serif text-xl">{job.title}</h2><p className="mt-2 text-xs text-white/40">{job.folderPath}</p></div><span className="text-[10px] uppercase text-[#c7a15a]">{job.analyzedAt ? "Analysée" : "À analyser"}</span></div></Link>)}</div>
  </section>;
}
