"use client";

import BackButton from "@/components/navigation/BackButton";


import { useEffect, useState } from "react";

type MonthlySummary = {
  year: number;
  month: number;
  monthName: string;
  totalHt: number;
  totalTva: number;
  totalTtc: number;
  invoicesCount: number;
  paymentsCount: number;
  unpaidInvoicesCount: number;
  anomaliesCount: number;
  missingDocsCount: number;
  reconciliationStatus: string;
  status: string;
  folders: string[];
};

type QuarterlyDossier = {
  year: number;
  quarter: number;
  quarterName: string;
  months: MonthlySummary[];
  quarterTotalHt: number;
  quarterTotalTva: number;
  quarterTotalTtc: number;
  isLocked: boolean;
  status: string;
};

export default function PreComptabilitePage() {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [quarter, setQuarter] = useState<number>(Math.ceil((new Date().getMonth() + 1) / 3));
  const [dossier, setDossier] = useState<QuarterlyDossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [locking, setLocking] = useState(false);

  async function loadDossier() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/pre-comptabilite?year=${year}&quarter=${quarter}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Accès refusé.");
      } else {
        setDossier(data.dossier);
      }
    } catch {
      setError("Erreur de chargement de la pré-comptabilité.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDossier();
  }, [year, quarter]);

  async function handleToggleLock() {
    if (!dossier) return;
    setLocking(true);
    setActionMessage(null);

    try {
      const action = dossier.isLocked ? "UNLOCK" : "LOCK";
      const res = await fetch("/api/owner/pre-comptabilite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          quarter,
          action,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionMessage(data.error || "Action impossible.");
      } else {
        setActionMessage(data.message);
        loadDossier();
      }
    } catch {
      setActionMessage("Erreur réseau.");
    } finally {
      setLocking(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl py-20 px-5 text-center">
        <BackButton />
        <p className="text-xl text-red-400">{error}</p>
        <p className="mt-4 text-sm text-white/50">L&apos;accès à la pré-comptabilité est réservé à l&apos;Owner.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">PRÉ-COMPTABILITÉ · OWNER ONLY</p>
          <h1 className="mt-2 font-serif text-3xl md:text-4xl text-white">Moteur de Préparation Comptable</h1>
          <p className="mt-2 text-sm text-white/50">Préparation automatique des dossiers mensuels et trimestriels pour l&apos;expert-comptable.</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="border border-white/10 bg-[#111] px-4 py-2 text-sm text-white outline-none"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <select
            value={quarter}
            onChange={(e) => setQuarter(parseInt(e.target.value))}
            className="border border-white/10 bg-[#111] px-4 py-2 text-sm text-white outline-none"
          >
            <option value={1}>Trimestre 1 (T1)</option>
            <option value={2}>Trimestre 2 (T2)</option>
            <option value={3}>Trimestre 3 (T3)</option>
            <option value={4}>Trimestre 4 (T4)</option>
          </select>
        </div>
      </div>

      {actionMessage && (
        <div className="mt-6 border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          {actionMessage}
        </div>
      )}

      {loading ? (
        <div className="mt-12 text-center text-sm text-white/40">Calcul des totaux et contrôles comptables…</div>
      ) : dossier ? (
        <div className="mt-8 space-y-8">
          <div className="grid gap-4 sm:grid-cols-3 border border-white/10 bg-[#111] p-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/40">Chiffre d&apos;Affaires HT (Trimestre)</p>
              <p className="mt-2 font-serif text-3xl text-[#c7a15a]">{dossier.quarterTotalHt.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/40">TVA Préparatoire</p>
              <p className="mt-2 font-serif text-3xl text-white/90">{dossier.quarterTotalTva.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/40">Total TTC</p>
              <p className="mt-2 font-serif text-3xl text-white">{dossier.quarterTotalTtc.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</p>
            </div>
          </div>

          <div className="flex items-center justify-between border border-white/10 bg-[#111] p-6">
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#c7a15a]">Statut du dossier trimestriel</span>
              <h3 className="mt-1 text-xl font-serif text-white">{dossier.status}</h3>
            </div>
            <button
              disabled={locking}
              onClick={handleToggleLock}
              className={`border px-6 py-3 text-xs uppercase tracking-widest font-semibold transition ${
                dossier.isLocked
                  ? "border-amber-500 text-amber-400 hover:bg-amber-500 hover:text-black"
                  : "border-[#c7a15a] bg-[#c7a15a] text-black hover:bg-[#c7a15a]/90"
              }`}
            >
              {locking
                ? "Traitement…"
                : dossier.isLocked
                ? "Déverrouiller le dossier"
                : "Marquer comme : DOSSIER COMPTABLE PRÊT"}
            </button>
          </div>

          <div className="space-y-6">
            <h3 className="font-serif text-2xl text-white">Détail des Mois du Trimestre</h3>
            <div className="grid gap-6 md:grid-cols-3">
              {dossier.months.map((m) => (
                <div key={m.month} className="border border-white/10 bg-[#111] p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h4 className="font-serif text-lg text-[#c7a15a]">{m.monthName} {m.year}</h4>
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 ${
                      m.status === "DOSSIER_COMPTABLE_PRET" ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/60"
                    }`}>
                      {m.status}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-white/70">
                    <div className="flex justify-between">
                      <span>Factures émises:</span>
                      <span className="font-mono text-white">{m.invoicesCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Paiements enregistrés:</span>
                      <span className="font-mono text-white">{m.paymentsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Anomalies / Pièces à vérifier:</span>
                      <span className={`font-mono ${m.anomaliesCount > 0 ? "text-amber-400 font-bold" : "text-white"}`}>{m.anomaliesCount}</span>
                    </div>
                    <div className="flex justify-between border-t border-white/5 pt-2">
                      <span>Montant HT:</span>
                      <span className="font-mono text-white">{m.totalHt.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <p className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Arborescence générée (15 dossiers) :</p>
                    <div className="max-h-32 overflow-y-auto space-y-1 font-mono text-[10px] text-white/50 border border-white/5 p-2 bg-black/40">
                      {m.folders.map((f) => (
                        <div key={f} className="truncate">{f}</div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
