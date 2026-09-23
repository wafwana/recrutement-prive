"use client";

import BackButton from "@/components/navigation/BackButton";


import { useEffect, useState } from "react";

type ArchivedDoc = {
  id: string;
  name: string;
  mimeType: string | null;
  size: number | null;
  senderRole: string;
  senderEmail: string;
  categoryPath: string;
  status: string;
  docType: string | null;
  createdAt: string;
};

export default function OwnerArchivagePage() {
  const [documents, setDocuments] = useState<ArchivedDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [selectedDoc, setSelectedDoc] = useState<ArchivedDoc | null>(null);
  const [newPath, setNewPath] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  async function loadDocuments() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (filterStatus) params.set("status", filterStatus);

      const res = await fetch(`/api/owner/archivage?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Accès refusé.");
        setLoading(false);
        return;
      }

      setDocuments(data.documents || []);
    } catch {
      setError("Erreur de chargement de l'archive.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, [filterStatus]);

  async function handleReclassify() {
    if (!selectedDoc || !newPath) return;
    setSaving(true);
    setActionMessage("");

    try {
      const res = await fetch("/api/owner/archivage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: selectedDoc.id,
          newCategoryPath: newPath,
          status: "VERIFIE",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionMessage(data.error || "Impossible de modifier le classement.");
      } else {
        setActionMessage("Document reclassé et vérifié avec succès.");
        setSelectedDoc(null);
        setNewPath("");
        loadDocuments();
      }
    } catch {
      setActionMessage("Erreur réseau.");
    } finally {
      setSaving(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl py-20 px-5 text-center">
        <BackButton />
        <p className="text-xl text-red-400">{error}</p>
        <p className="mt-4 text-sm text-white/50">L&apos;accès à l&apos;archive centrale est strictement réservé à l&apos;Owner.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">OWNER ONLY</p>
          <h1 className="mt-2 font-serif text-3xl md:text-4xl text-white">Archive Centralisée & Classement</h1>
          <p className="mt-2 text-sm text-white/50">Consultez, recherchez et gérez l&apos;intégralité des documents archivés de la plateforme.</p>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center">
        <input
          type="text"
          placeholder="Rechercher (nom, email, dossier, type)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && loadDocuments()}
          className="w-full md:w-80 border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none"
        >
          <option value="">Tous les statuts</option>
          <option value="A_VERIFIER">À Vérifier / À Classer</option>
          <option value="VERIFIE">Vérifié</option>
          <option value="RECLASSE">Reclassé</option>
        </select>
        <button
          onClick={loadDocuments}
          className="border border-[#c7a15a] px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-[#c7a15a] hover:bg-[#c7a15a] hover:text-black transition"
        >
          Rechercher
        </button>
      </div>

      {actionMessage && (
        <div className="mt-4 border border-white/10 bg-[#111] p-4 text-sm text-emerald-400">
          {actionMessage}
        </div>
      )}

      {loading ? (
        <div className="mt-12 text-center text-sm text-white/40">Chargement des archives…</div>
      ) : (
        <div className="mt-8 space-y-4">
          {documents.length === 0 ? (
            <div className="border border-white/10 bg-[#111] p-8 text-center text-sm text-white/40">
              Aucun document archivé ne correspond à la recherche.
            </div>
          ) : (
            documents.map((doc) => (
              <div key={doc.id} className="border border-white/10 bg-[#111] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-white text-base">{doc.name}</span>
                    <span className="text-[10px] uppercase tracking-widest border border-white/20 px-2 py-0.5 text-white/60">
                      {doc.senderRole}
                    </span>
                    <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 ${doc.status === "A_VERIFIER" ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"}`}>
                      {doc.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#c7a15a] font-mono">{doc.categoryPath}</p>
                  <p className="text-xs text-white/40">
                    Transmis par <span className="text-white/70">{doc.senderEmail}</span> le {new Date(doc.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>

                <div>
                  <button
                    onClick={() => {
                      setSelectedDoc(doc);
                      setNewPath(doc.categoryPath);
                    }}
                    className="border border-white/20 px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-white/80 hover:border-[#c7a15a] hover:text-[#c7a15a]"
                  >
                    Valider / Reclasser
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {selectedDoc && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-5 z-50">
          <div className="border border-white/10 bg-[#111] max-w-lg w-full p-6 space-y-5">
            <h3 className="font-serif text-xl text-white">Reclasser / Valider le Document</h3>
            <p className="text-xs text-white/60">Document : <span className="text-white font-semibold">{selectedDoc.name}</span></p>

            <label className="block text-xs uppercase tracking-wider text-white/40">
              Chemin d&apos;archivage destination
              <input
                type="text"
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                className="mt-2 w-full border border-white/10 bg-black px-4 py-3 text-sm text-white font-mono outline-none"
              />
            </label>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setSelectedDoc(null)}
                className="border border-white/20 px-4 py-2 text-xs uppercase text-white/60"
              >
                Annuler
              </button>
              <button
                disabled={saving}
                onClick={handleReclassify}
                className="border border-[#c7a15a] bg-[#c7a15a] px-5 py-2 text-xs uppercase font-semibold text-black hover:bg-[#c7a15a]/90"
              >
                {saving ? "Sauvegarde…" : "Confirmer le classement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
