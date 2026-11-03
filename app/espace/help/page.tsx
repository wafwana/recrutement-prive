"use client";

import BackButton from "@/components/navigation/BackButton";
import { useEffect, useState } from "react";

type Guide = {
  id: string;
  title: string;
  module: string;
  summary: string;
  prerequisites: string[];
  expectedResult: string;
  steps: Array<{ title: string; detail: string }>;
  troubleshooting: Array<{ problem: string; solution: string }>;
  relatedLinks: Array<{ label: string; href: string }>;
  keywords: string[];
};

type Template = {
  id: string;
  name: string;
  category: string;
  subject: string;
};

export default function HelpCenterPage() {
  const [q, setQ] = useState("");
  const [module, setModule] = useState("");
  const [guides, setGuides] = useState<Guide[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [busy, setBusy] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);

  async function loadSearch() {
    setBusy(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (module) params.set("module", module);

      const res = await fetch(`/api/help/search?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setGuides(data.guides || []);
        setTemplates(data.templates || []);
        if (data.guides && data.guides.length > 0 && !selectedGuide) {
          setSelectedGuide(data.guides[0]);
        }
      }
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadSearch();
  }, [module]);

  return (
    <section className="mx-auto w-[min(1380px,calc(100%-32px))] py-10 md:w-[min(1380px,calc(100%-72px))] md:py-16">
      <BackButton />
      <div className="flex flex-col gap-4 border-b border-white/10 pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">
            RECRUTEMENT PRIVÉ · CENTRE D'AIDE & RECHERCHE
          </p>
          <h1 className="mt-3 font-serif text-4xl text-white md:text-5xl">
            Mode d'emploi & Guides opérationnels
          </h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-white/50">
            Retrouvez les guides de procédures, les instructions étape par étape, les permissions requises et les raccourcis vers la bibliothèque de mailings et la recherche de documents.
          </p>
        </div>
      </div>

      <div className="mt-8 border border-white/10 bg-[#111] p-6">
        <div className="grid gap-4 md:grid-cols-[1fr_240px_auto]">
          <div>
            <label className="block text-[9px] uppercase tracking-[0.16em] text-white/40">
              Recherche globale dans l'aide et les procédures
            </label>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadSearch()}
              placeholder="Ex. sourcing, casinos, analyse CV, permissions, mailing..."
              className="mt-2 h-11 w-full border border-white/10 bg-[#0b0b0b] px-4 text-sm text-white outline-none focus:border-[#c7a15a]"
            />
          </div>
          <div>
            <label className="block text-[9px] uppercase tracking-[0.16em] text-white/40">
              Module applicatif
            </label>
            <select
              value={module}
              onChange={(e) => setModule(e.target.value)}
              className="mt-2 h-11 w-full border border-white/10 bg-[#0b0b0b] px-3 text-xs text-white outline-none focus:border-[#c7a15a]"
            >
              <option value="">Tous les modules</option>
              <option value="SOURCING">Sourcing & Collecte</option>
              <option value="CV_LIBRARY">CVthèque & Intake</option>
              <option value="MATCHING">Matching & Offres</option>
              <option value="METIERS">Métiers & Taxonomie</option>
              <option value="PARTNERS">Partenaires & Réseaux</option>
              <option value="BILLING">Facturation & Compta</option>
              <option value="ADMIN">Administration & Droits</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={loadSearch}
              disabled={busy}
              className="h-11 border border-[#c7a15a] bg-[#c7a15a] px-6 text-[10px] uppercase tracking-[0.16em] text-[#111] hover:bg-[#d8b26b] disabled:opacity-50"
            >
              {busy ? "Recherche…" : "Rechercher"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-[#c7a15a]">
            Guides disponibles ({guides.length})
          </h2>
          <div className="space-y-2">
            {guides.map((guide) => (
              <div
                key={guide.id}
                onClick={() => setSelectedGuide(guide)}
                className={`cursor-pointer border p-4 transition ${
                  selectedGuide?.id === guide.id
                    ? "border-[#c7a15a] bg-[#c7a15a]/10 text-white"
                    : "border-white/10 bg-[#111] text-white/70 hover:border-white/20 hover:bg-[#161616]"
                }`}
              >
                <span className="inline-block bg-white/5 px-2 py-0.5 text-[8px] uppercase tracking-[0.14em] text-[#c7a15a]">
                  {guide.module}
                </span>
                <h3 className="mt-2 text-sm font-medium text-white">{guide.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-white/45">{guide.summary}</p>
              </div>
            ))}
            {guides.length === 0 && !busy && (
              <p className="border border-dashed border-white/10 p-6 text-xs text-white/40">
                Aucun guide ne correspond à votre recherche.
              </p>
            )}
          </div>

          {templates.length > 0 && (
            <div className="mt-8 border-t border-white/10 pt-6 space-y-3">
              <h2 className="text-[11px] uppercase tracking-[0.2em] text-emerald-400">
                Modèles de Mailings correspondants ({templates.length})
              </h2>
              {templates.map((tpl) => (
                <div key={tpl.id} className="border border-white/10 bg-[#111] p-3">
                  <p className="text-xs font-medium text-white">{tpl.name}</p>
                  <p className="mt-1 text-[10px] text-white/40">{tpl.subject}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          {selectedGuide ? (
            <div className="border border-white/10 bg-[#111] p-6 md:p-8 space-y-6">
              <div>
                <span className="bg-[#c7a15a]/10 border border-[#c7a15a]/40 px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-[#c7a15a]">
                  Module {selectedGuide.module}
                </span>
                <h2 className="mt-3 font-serif text-3xl text-white">{selectedGuide.title}</h2>
                <p className="mt-3 text-sm leading-7 text-white/70">{selectedGuide.summary}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 border-y border-white/10 py-5">
                <div>
                  <h4 className="text-[10px] uppercase tracking-[0.16em] text-white/40">Prérequis</h4>
                  <ul className="mt-2 space-y-1 text-xs text-white/60 list-disc list-inside">
                    {selectedGuide.prerequisites.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-[10px] uppercase tracking-[0.16em] text-white/40">Résultat attendu</h4>
                  <p className="mt-2 text-xs text-emerald-300">{selectedGuide.expectedResult}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium uppercase tracking-[0.14em] text-[#c7a15a]">
                  Instructions étape par étape
                </h3>
                <div className="mt-4 space-y-4">
                  {selectedGuide.steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-4 border border-white/5 bg-[#0b0b0b] p-4">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#c7a15a]/20 text-xs font-bold text-[#c7a15a]">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="text-xs font-semibold text-white">{step.title}</h4>
                        <p className="mt-1 text-xs text-white/60">{step.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedGuide.troubleshooting.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium uppercase tracking-[0.14em] text-amber-400">
                    Dépannage & Erreurs fréquentes
                  </h3>
                  <div className="mt-3 space-y-3">
                    {selectedGuide.troubleshooting.map((t, idx) => (
                      <div key={idx} className="border border-amber-500/20 bg-amber-500/5 p-4 text-xs">
                        <p className="font-semibold text-amber-300">Constat : {t.problem}</p>
                        <p className="mt-1 text-white/70">Solution : {t.solution}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedGuide.relatedLinks.length > 0 && (
                <div className="pt-4">
                  <h4 className="text-[10px] uppercase tracking-[0.16em] text-white/40">Accès directs</h4>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {selectedGuide.relatedLinks.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.href}
                        className="border border-white/15 bg-white/5 px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-white/80 hover:bg-white/10"
                      >
                        {link.label} ↗
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center border border-dashed border-white/10 p-8 text-center text-xs text-white/40">
              Sélectionnez un guide dans la liste pour afficher les instructions.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
