"use client";

import { useEffect, useState } from "react";

type Doc = { id: string; name: string; mimeType: string | null; size: number | null; senderRole: string; senderEmail: string; categoryPath: string; status: string; docType: string | null; createdAt: string };

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/documents/archive", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Accès refusé.");
        setDocuments(d.documents || []);
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <section className="mx-auto w-[min(1100px,calc(100%-40px))] py-12 md:py-20">
      <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Documents</p>
      <h1 className="mt-3 font-serif text-4xl">Consulter les documents</h1>
      <p className="mt-3 text-sm text-white/50">Documents opérationnels uniquement. Les documents financiers, comptables, contractuels et sensibles restent réservés à l'Owner.</p>
      {error && <p className="mt-6 border border-red-400/30 p-4 text-sm text-red-300">{error}</p>}
      <div className="mt-8 space-y-3">
        {documents.map((doc) => (
          <div key={doc.id} className="flex flex-col gap-3 border border-white/10 bg-[#111] p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-white/85">{doc.name}</p>
              <p className="mt-1 text-xs text-white/40">{doc.categoryPath} · {doc.status} · {doc.senderRole}</p>
              <p className="mt-1 text-xs text-white/30">{new Date(doc.createdAt).toLocaleString("fr-FR")}</p>
            </div>
            <a href={"/api/documents/archive/" + doc.id} target="_blank" rel="noreferrer" className="border border-[#c7a15a] px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-[#c7a15a]">Consulter</a>
          </div>
        ))}
        {!documents.length && !error && <p className="text-sm text-white/40">Aucun document accessible.</p>}
      </div>
    </section>
  );
}
