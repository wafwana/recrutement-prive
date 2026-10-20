"use client";

import BackButton from "@/components/navigation/BackButton";
import { useEffect, useState } from "react";

type Template = {
  id: string;
  code: string;
  name: string;
  category: "ENTREPRISES" | "SPONSORS" | "COLLABORATEURS" | "PARTENAIRES";
  targetRole: string;
  language: string;
  subject: string;
  body: string;
  variables: Array<{ code: string; label: string; example: string }>;
  status: string;
  version: number;
};

export default function MailingsLibraryPage() {
  const [category, setCategory] = useState<string>("ENTREPRISES");
  const [q, setQ] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);

  async function loadTemplates() {
    setBusy(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (q.trim()) params.set("q", q.trim());

      const res = await fetch(`/api/mailings/templates?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setTemplates(data.templates || []);
        if (data.templates && data.templates.length > 0) {
          setSelectedTemplate(data.templates[0]);
          initVariables(data.templates[0]);
        } else {
          setSelectedTemplate(null);
        }
      }
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }

  function initVariables(tpl: Template) {
    const init: Record<string, string> = {};
    for (const v of tpl.variables) {
      init[v.code] = v.example;
    }
    setVariableValues(init);
  }

  useEffect(() => {
    loadTemplates();
  }, [category]);

  function renderPreview(text: string) {
    let result = text;
    for (const [key, val] of Object.entries(variableValues)) {
      result = result.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), val || `[${key}]`);
    }
    return result;
  }

  function handleSendConfirmation() {
    setConfirmStatus(`Modèle "${selectedTemplate?.name}" préparé pour ${recipientEmail}. Action enregistrée sans envoi automatique.`);
    setSendModalOpen(false);
  }

  return (
    <section className="mx-auto w-[min(1380px,calc(100%-32px))] py-10 md:w-[min(1380px,calc(100%-72px))] md:py-16">
      <BackButton />
      <div className="flex flex-col gap-4 border-b border-white/10 pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">
            RECRUTEMENT PRIVÉ · BIBLIOTHÈQUE DE MAILINGS
          </p>
          <h1 className="mt-3 font-serif text-4xl text-white md:text-5xl">
            Modèles & e-mails relationnels
          </h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-white/50">
            Bibliothèque de modèles e-mails personnalisables par catégorie de destinataires. Les modèles sont strictement séparés des campagnes et aucun envoi n'est déclenché sans confirmation humaine explicite.
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {(["ENTREPRISES", "SPONSORS", "COLLABORATEURS", "PARTENAIRES"] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-5 py-2.5 text-[10px] uppercase tracking-[0.16em] transition ${
              category === cat
                ? "border border-[#c7a15a] bg-[#c7a15a] text-[#111] font-semibold"
                : "border border-white/10 bg-[#111] text-white/60 hover:border-white/20"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="mt-6 border border-white/10 bg-[#111] p-5">
        <div className="flex gap-3">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadTemplates()}
            placeholder="Filtrer un modèle par nom, objet ou variables…"
            className="h-10 flex-1 border border-white/10 bg-[#0b0b0b] px-4 text-xs text-white outline-none focus:border-[#c7a15a]"
          />
          <button
            onClick={loadTemplates}
            disabled={busy}
            className="h-10 border border-[#c7a15a] bg-[#c7a15a]/10 px-5 text-[10px] uppercase tracking-[0.14em] text-[#c7a15a] hover:bg-[#c7a15a]/20"
          >
            Filtrer
          </button>
        </div>
      </div>

      {confirmStatus && (
        <div className="mt-4 border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300">
          {confirmStatus}
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[360px_1fr]">
        <div className="space-y-3">
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-[#c7a15a]">
            Modèles ({templates.length})
          </h2>
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              onClick={() => {
                setSelectedTemplate(tpl);
                initVariables(tpl);
              }}
              className={`cursor-pointer border p-4 transition ${
                selectedTemplate?.id === tpl.id
                  ? "border-[#c7a15a] bg-[#c7a15a]/10 text-white"
                  : "border-white/10 bg-[#111] text-white/70 hover:border-white/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-[0.14em] text-[#c7a15a]">
                  v{tpl.version} · {tpl.status}
                </span>
                <span className="text-[9px] text-white/30">{tpl.targetRole}</span>
              </div>
              <h3 className="mt-2 text-sm font-medium text-white">{tpl.name}</h3>
              <p className="mt-1 line-clamp-1 text-xs text-white/40">{tpl.subject}</p>
            </div>
          ))}
        </div>

        <div>
          {selectedTemplate ? (
            <div className="border border-white/10 bg-[#111] p-6 md:p-8 space-y-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between border-b border-white/10 pb-5">
                <div>
                  <span className="text-[9px] uppercase tracking-[0.16em] text-[#c7a15a]">
                    Catégorie : {selectedTemplate.category}
                  </span>
                  <h2 className="mt-1 font-serif text-2xl text-white">{selectedTemplate.name}</h2>
                  <p className="mt-1 text-xs text-white/40">Code : {selectedTemplate.code}</p>
                </div>
                <button
                  onClick={() => setSendModalOpen(true)}
                  className="border border-[#c7a15a] bg-[#c7a15a] px-5 py-2.5 text-[10px] uppercase tracking-[0.14em] text-[#111] hover:bg-[#d8b26b]"
                >
                  Préparer la personnalisation
                </button>
              </div>

              <div>
                <h3 className="text-[11px] uppercase tracking-[0.16em] text-white/40 mb-3">
                  Variables de personnalisation
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedTemplate.variables.map((v) => (
                    <div key={v.code}>
                      <label className="block text-[9px] uppercase tracking-[0.12em] text-white/50">
                        {v.label} (<code className="text-[#c7a15a]">{`{{${v.code}}}`}</code>)
                      </label>
                      <input
                        type="text"
                        value={variableValues[v.code] || ""}
                        onChange={(e) =>
                          setVariableValues({ ...variableValues, [v.code]: e.target.value })
                        }
                        className="mt-1 w-full border border-white/10 bg-[#0b0b0b] px-3 py-1.5 text-xs text-white outline-none focus:border-[#c7a15a]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/10">
                <h3 className="text-[11px] uppercase tracking-[0.16em] text-[#c7a15a]">
                  Prévisualisation en direct
                </h3>
                <div className="border border-white/10 bg-[#0b0b0b] p-5 text-xs space-y-3 font-mono">
                  <div className="border-b border-white/10 pb-2">
                    <span className="text-white/40">Objet : </span>
                    <span className="text-white font-sans">{renderPreview(selectedTemplate.subject)}</span>
                  </div>
                  <div className="whitespace-pre-wrap font-sans leading-6 text-white/80">
                    {renderPreview(selectedTemplate.body)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center border border-dashed border-white/10 p-8 text-center text-xs text-white/40">
              Sélectionnez un modèle pour afficher la prévisualisation.
            </div>
          )}
        </div>
      </div>

      {sendModalOpen && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg border border-white/15 bg-[#111] p-6 text-white shadow-2xl">
            <h3 className="font-serif text-2xl">Validation explicite de l'envoi</h3>
            <p className="mt-2 text-xs leading-6 text-white/60">
              Conformément aux règles de sécurité de Recrutement Privé, aucun e-mail n'est transmis sans validation explicite d'un utilisateur autorisé.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-[9px] uppercase tracking-[0.14em] text-white/40">
                  Adresse e-mail du destinataire
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="contact@exemple-entreprise.fr"
                  className="mt-1 w-full border border-white/10 bg-[#0b0b0b] px-3 py-2 text-xs text-white outline-none focus:border-[#c7a15a]"
                />
              </div>
              <div className="border border-white/10 bg-[#0b0b0b] p-3 text-[11px] text-white/50">
                Modèle sélectionné : <span className="text-white">{selectedTemplate.name}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setSendModalOpen(false)}
                className="border border-white/15 px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-white/60"
              >
                Annuler
              </button>
              <button
                onClick={handleSendConfirmation}
                disabled={!recipientEmail.trim()}
                className="border border-[#c7a15a] bg-[#c7a15a] px-5 py-2 text-[10px] uppercase tracking-[0.14em] text-[#111] disabled:opacity-40"
              >
                Confirmer la préparation
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
