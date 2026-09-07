"use client";

import { useActionState, useTransition } from "react";
import { uploadCandidateDocument, deleteCandidateDocument } from "./actions";

type Doc = { id: string; name: string; createdAt: Date };

export default function DocumentManager({ documents }: { documents: Doc[] }) {
  const [isDeleting, startTransition] = useTransition();
  const [uploadState, uploadAction, uploadPending] = useActionState(async (_prev: string, formData: FormData) => {
    try {
      await uploadCandidateDocument(formData);
      return "Document ajouté avec succès.";
    } catch (error) {
      return error instanceof Error ? error.message : "Erreur lors de l'ajout du document.";
    }
  }, "");

  const handleDelete = (docId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce document ?")) return;
    startTransition(async () => {
      try {
        await deleteCandidateDocument(docId);
      } catch (error) {
        alert(error instanceof Error ? error.message : "Impossible de supprimer le document.");
      }
    });
  };

  return (
    <div className="border border-white/10 bg-[#111] p-8">
      <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Documents & CVs</p>
      <h3 className="mt-2 font-serif text-xl">Vos pièces justificatives</h3>

      <div className="mt-6 space-y-3">
        {documents.map((doc) => {
          const downloadUrl = `/api/candidats/documents/${doc.id}`;
          return (
            <div key={doc.id} className="flex items-center justify-between border-b border-white/10 pb-3 last:border-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-white">{doc.name}</p>
                <a href={downloadUrl} target="_blank" rel="noreferrer" className="text-xs text-[#c7a15a] hover:underline">
                  Télécharger / Afficher ↗
                </a>
              </div>
              <button
                onClick={() => handleDelete(doc.id)}
                disabled={isDeleting}
                className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
              >
                Supprimer
              </button>
            </div>
          );
        })}

        {documents.length === 0 ? (
          <p className="text-sm leading-6 text-white/45">Aucun document joint pour le moment.</p>
        ) : null}
      </div>

      <form action={uploadAction} className="mt-8 border-t border-white/10 pt-6">
        <p className="text-xs uppercase tracking-[0.18em] text-white/50">Ajouter un document (PDF, Word - 10 Mo max)</p>
        {uploadState ? <p aria-live="polite" className="mt-2 text-xs text-[#c7a15a]">{uploadState}</p> : null}

        <div className="mt-4 grid gap-3">
          <input
            name="name"
            placeholder="Intitulé du document (ex: CV 2025, Lettre de motivation)"
            maxLength={180}
            className="w-full border border-white/10 bg-transparent px-4 py-2 text-xs text-white outline-none"
          />
          <input
            type="file"
            name="document"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            required
            className="w-full border border-white/10 bg-transparent px-4 py-2 text-xs text-white/70 file:mr-4 file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-xs file:text-white hover:file:bg-white/20"
          />
        </div>

        <button
          disabled={uploadPending}
          className="mt-4 border border-[#c7a15a] px-5 py-2 text-[10px] uppercase tracking-[0.2em] text-[#c7a15a] transition hover:bg-[#c7a15a] hover:text-black disabled:opacity-50"
        >
          {uploadPending ? "Envoi en cours…" : "Ajouter le document"}
        </button>
      </form>
    </div>
  );
}
