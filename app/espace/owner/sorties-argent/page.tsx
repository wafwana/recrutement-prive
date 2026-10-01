"use client";

import BackButton from "@/components/navigation/BackButton";
import { useEffect, useState, useCallback } from "react";

type OutflowItem = {
  id: string;
  outflowNumber: string;
  operationDate: string;
  paymentDate?: string | null;
  beneficiaryName: string;
  beneficiaryEmail?: string | null;
  reason: string;
  description?: string | null;
  category?: string | null;
  originModule: string;
  amountHt: number;
  amountTva: number;
  amountTtc: number;
  currency: string;
  paymentMethod?: string | null;
  paymentSource?: string | null;
  referenceNumber?: string | null;
  documentUrl?: string | null;
  documentId?: string | null;
  status: string;
  reconciliationStatus: string;
  isPrivateOwnerExpense: boolean;
  auditHistory?: Array<{
    timestamp: string;
    actorUserId: string;
    actorRole: string;
    action: string;
    notes?: string;
    changes?: Record<string, { from: unknown; to: unknown }>;
  }>;
};

type SummaryData = {
  count: number;
  totalHt: number;
  totalTva: number;
  totalTtc: number;
  pendingDocsCount: number;
};

export default function RegistreSortiesPage() {
  const [outflows, setOutflows] = useState<OutflowItem[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Filters
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [moduleFilter, setModuleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [beneficiaryFilter, setBeneficiaryFilter] = useState<string>("");

  // Create Outflow Form Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    beneficiaryName: "",
    beneficiaryEmail: "",
    reason: "",
    description: "",
    category: "",
    originModule: "PAIE",
    amountHt: "",
    amountTva: "0",
    amountTtc: "",
    paymentMethod: "VIREMENT",
    paymentSource: "COMPTE_PRINCIPAL",
    referenceNumber: "",
    documentUrl: "",
    status: "PAYE",
  });

  // Edit/Category Modal state
  const [selectedOutflow, setSelectedOutflow] = useState<OutflowItem | null>(null);
  const [editCategory, setEditCategory] = useState("");
  const [editDocUrl, setEditDocUrl] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const loadOutflows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("year", year.toString());
      if (moduleFilter) params.set("module", moduleFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (beneficiaryFilter) params.set("beneficiary", beneficiaryFilter);

      const res = await fetch(`/api/owner/outflows?${params.toString()}`, { cache: "no-store" });

      let data: { error?: string; outflows?: OutflowItem[]; summary?: SummaryData } | null = null;
      try {
        data = await res.json();
      } catch {
        // Non-JSON response (e.g. HTML 500 error page from server)
      }

      if (res.status === 401) {
        setError(data?.error || "Session expirée ou non authentifiée. Veuillez vous reconnecter.");
      } else if (res.status === 403) {
        setError(data?.error || "Accès strictement réservé à l'Owner. Rôle non autorisé.");
      } else if (!res.ok) {
        setError(data?.error || `Erreur serveur (${res.status}). Veuillez réessayer ou contacter le support.`);
      } else if (data) {
        setOutflows(data.outflows || []);
        setSummary(data.summary || null);
      } else {
        setError("Réponse du serveur invalide.");
      }
    } catch {
      setError("Erreur réseau ou connexion au serveur impossible.");
    } finally {
      setLoading(false);
    }
  }, [year, moduleFilter, statusFilter, beneficiaryFilter]);

  useEffect(() => {
    loadOutflows();
  }, [loadOutflows]);

  async function handleCreateOutflow(e: React.FormEvent) {
    e.preventDefault();
    setActionMessage(null);
    try {
      const ht = parseFloat(formData.amountHt) || 0;
      const tva = parseFloat(formData.amountTva) || 0;
      const ttc = parseFloat(formData.amountTtc) || ht + tva;

      const res = await fetch("/api/owner/outflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          amountHt: ht,
          amountTva: tva,
          amountTtc: ttc,
        }),
      });

      let data: { error?: string; message?: string } | null = null;
      try {
        data = await res.json();
      } catch {
        // Non-JSON response
      }

      if (res.status === 401) {
        setActionMessage("Session expirée. Veuillez vous reconnecter.");
      } else if (res.status === 403) {
        setActionMessage("Accès refusé. Rôle Owner requis.");
      } else if (!res.ok) {
        setActionMessage(`Erreur: ${data?.error || "Échec de l'enregistrement de la sortie d'argent."}`);
      } else {
        setActionMessage("Sortie d'argent ajoutée au registre comptable !");
        setShowCreateModal(false);
        setFormData({
          beneficiaryName: "",
          beneficiaryEmail: "",
          reason: "",
          description: "",
          category: "",
          originModule: "PAIE",
          amountHt: "",
          amountTva: "0",
          amountTtc: "",
          paymentMethod: "VIREMENT",
          paymentSource: "COMPTE_PRINCIPAL",
          referenceNumber: "",
          documentUrl: "",
          status: "PAYE",
        });
        loadOutflows();
      }
    } catch {
      setActionMessage("Erreur réseau lors de la création.");
    }
  }

  async function handleUpdateOutflow(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOutflow) return;
    setActionMessage(null);

    try {
      const res = await fetch(`/api/owner/outflows/${selectedOutflow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: editCategory,
          documentUrl: editDocUrl,
          status: editStatus,
          notes: editNotes,
        }),
      });

      let data: { error?: string; message?: string } | null = null;
      try {
        data = await res.json();
      } catch {
        // Non-JSON response
      }

      if (res.status === 401) {
        setActionMessage("Session expirée. Veuillez vous reconnecter.");
      } else if (res.status === 403) {
        setActionMessage("Accès refusé. Rôle Owner requis.");
      } else if (!res.ok) {
        setActionMessage(`Erreur: ${data?.error || "Échec de la mise à jour."}`);
      } else {
        setActionMessage("Opération comptable mise à jour.");
        setSelectedOutflow(null);
        loadOutflows();
      }
    } catch {
      setActionMessage("Erreur réseau lors de la mise à jour.");
    }
  }

  function handleExportCsv() {
    const params = new URLSearchParams();
    params.set("year", year.toString());
    params.set("format", "csv");
    if (moduleFilter) params.set("module", moduleFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (beneficiaryFilter) params.set("beneficiary", beneficiaryFilter);

    window.open(`/api/owner/outflows?${params.toString()}`, "_blank");
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl py-20 px-5 text-center">
        <BackButton />
        <div className="mt-8 border border-red-500/30 bg-red-500/10 p-8 rounded-lg">
          <p className="text-xl font-semibold text-red-400">{error}</p>
          <p className="mt-4 text-sm text-white/60">
            Ce registre est exclusivement réservé au rôle OWNER. Aucun autre utilisateur ou rôle ne peut y accéder.
          </p>
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              onClick={loadOutflows}
              className="border border-[#c7a15a] bg-[#c7a15a] px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-black hover:bg-[#c7a15a]/90"
            >
              Réessayer
            </button>
            <a
              href="/connexion"
              className="border border-white/20 bg-white/5 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-white/10"
            >
              Se reconnecter
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
      <BackButton />

      <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-white/10 pb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">RÈGLE ABSOLUE · OWNER ONLY</p>
          <h1 className="mt-2 font-serif text-3xl md:text-4xl text-white">Registre comptable — Sorties d’argent</h1>
          <p className="mt-2 text-sm text-white/60">
            Centralisation automatique et traçabilité comptable de toutes les sorties d’argent de Recrutement Privé.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="border border-[#c7a15a] bg-[#c7a15a] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-black hover:bg-[#c7a15a]/90"
          >
            + Enregistrer une sortie
          </button>

          <button
            onClick={handleExportCsv}
            className="border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-white/10"
          >
            Exporter pour l&apos;expert-comptable (CSV)
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="mt-6 border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
          {actionMessage}
        </div>
      )}

      {/* Summary KPI Panel */}
      {summary && (
        <div className="mt-8 grid gap-4 sm:grid-cols-4 border border-white/10 bg-[#111] p-6">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/40">Total Décaissements HT</p>
            <p className="mt-2 font-serif text-2xl text-white">
              {summary.totalHt.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/40">TVA Récupérable / Payée</p>
            <p className="mt-2 font-serif text-2xl text-white/80">
              {summary.totalTva.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/40">Total TTC Décaissé</p>
            <p className="mt-2 font-serif text-3xl text-[#c7a15a]">
              {summary.totalTtc.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/40">À Compléter / Justificatifs</p>
            <p className={`mt-2 font-serif text-2xl ${summary.pendingDocsCount > 0 ? "text-amber-400 font-bold" : "text-emerald-400"}`}>
              {summary.pendingDocsCount} op.
            </p>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border border-white/10 bg-[#111] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="border border-white/15 bg-black px-3 py-2 text-xs text-white outline-none"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="border border-white/15 bg-black px-3 py-2 text-xs text-white outline-none"
          >
            <option value="">Tous les modules d&apos;origine</option>
            <option value="PAIE">Paie salariée</option>
            <option value="PRESTATAIRE">Paiement prestataire</option>
            <option value="FRAIS_PRO">Frais professionnels</option>
            <option value="REMBOURSEMENT">Remboursements</option>
            <option value="FOURNISSEUR">Fournisseurs</option>
            <option value="PRELEVEMENT_OWNER">Mouvements OWNER</option>
            <option value="AUTRE">Autre sortie</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-white/15 bg-black px-3 py-2 text-xs text-white outline-none"
          >
            <option value="">Tous les statuts</option>
            <option value="A_COMPLETER">À compléter (Justificatif / Catégorie)</option>
            <option value="PREVU">Prévu</option>
            <option value="AUTORISE">Autorisé (OWNER)</option>
            <option value="PAYE">Payé</option>
            <option value="RAPPROCHE">Rapproché</option>
            <option value="ANNULE">Annulé / Contrepassé</option>
          </select>

          <input
            type="text"
            placeholder="Rechercher bénéficiaire…"
            value={beneficiaryFilter}
            onChange={(e) => setBeneficiaryFilter(e.target.value)}
            className="border border-white/15 bg-black px-3 py-2 text-xs text-white outline-none placeholder:text-white/30"
          />
        </div>

        <button
          onClick={loadOutflows}
          className="border border-white/20 bg-white/5 px-3 py-2 text-xs uppercase tracking-wider text-white hover:bg-white/10"
        >
          Actualiser
        </button>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="mt-12 text-center text-sm text-white/40">Chargement du registre comptable…</div>
      ) : outflows.length === 0 ? (
        <div className="mt-12 border border-white/10 bg-[#111] p-12 text-center text-white/50">
          Aucune sortie d&apos;argent enregistrée pour les filtres sélectionnés.
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto border border-white/10 bg-[#111]">
          <table className="w-full text-left text-xs text-white/80">
            <thead className="border-b border-white/10 bg-black/60 text-[10px] uppercase tracking-wider text-white/40">
              <tr>
                <th className="p-3">N° / Date</th>
                <th className="p-3">Module</th>
                <th className="p-3">Bénéficiaire / Motif</th>
                <th className="p-3">Catégorie</th>
                <th className="p-3 text-right">Montant HT</th>
                <th className="p-3 text-right">TVA</th>
                <th className="p-3 text-right">Montant TTC</th>
                <th className="p-3 text-center">Justificatif</th>
                <th className="p-3 text-center">Statut</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {outflows.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.02]">
                  <td className="p-3">
                    <p className="font-mono text-[11px] text-[#c7a15a]">{item.outflowNumber}</p>
                    <p className="text-[10px] text-white/40">
                      {new Date(item.operationDate).toLocaleDateString("fr-FR")}
                    </p>
                  </td>

                  <td className="p-3">
                    <span className="border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] uppercase tracking-wider text-white/70">
                      {item.originModule}
                    </span>
                  </td>

                  <td className="p-3">
                    <p className="font-semibold text-white">{item.beneficiaryName}</p>
                    <p className="text-[11px] text-white/50">{item.reason}</p>
                    {item.referenceNumber && (
                      <p className="text-[9px] text-white/30 font-mono">Ref: {item.referenceNumber}</p>
                    )}
                  </td>

                  <td className="p-3">
                    {item.category ? (
                      <span className="text-white/80">{item.category}</span>
                    ) : (
                      <span className="text-amber-400 font-semibold italic">Non catégorisé</span>
                    )}
                  </td>

                  <td className="p-3 text-right font-mono text-white/80">
                    {item.amountHt.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                  </td>

                  <td className="p-3 text-right font-mono text-white/60">
                    {item.amountTva.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                  </td>

                  <td className="p-3 text-right font-mono font-bold text-white">
                    {item.amountTtc.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                  </td>

                  <td className="p-3 text-center">
                    {item.documentUrl ? (
                      <a
                        href={item.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 underline hover:text-emerald-300 text-[10px]"
                      >
                        Voir pièce
                      </a>
                    ) : (
                      <span className="text-amber-400 text-[10px] uppercase tracking-wider font-semibold">
                        À joindre
                      </span>
                    )}
                  </td>

                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-0.5 text-[9px] uppercase tracking-wider font-semibold border ${
                        item.status === "A_COMPLETER"
                          ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                          : item.status === "ANNULE"
                          ? "border-red-500/40 bg-red-500/10 text-red-300 line-through"
                          : item.status === "PAYE" || item.status === "RAPPROCHE"
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                          : "border-white/20 bg-white/5 text-white/60"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>

                  <td className="p-3 text-center">
                    <button
                      onClick={() => {
                        setSelectedOutflow(item);
                        setEditCategory(item.category || "");
                        setEditDocUrl(item.documentUrl || "");
                        setEditStatus(item.status);
                        setEditNotes("");
                      }}
                      className="border border-white/20 px-2 py-1 text-[10px] text-white hover:bg-white/10"
                    >
                      Compléter / Gérer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal create outflow */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-2xl border border-white/20 bg-[#111] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="font-serif text-xl text-white">Enregistrer une sortie d&apos;argent</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-white/50 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateOutflow} className="space-y-4 text-xs">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-white/60 mb-1">Module d&apos;origine</label>
                  <select
                    value={formData.originModule}
                    onChange={(e) => setFormData({ ...formData, originModule: e.target.value })}
                    className="w-full border border-white/15 bg-black px-3 py-2 text-white outline-none"
                  >
                    <option value="PAIE">Paie salariée</option>
                    <option value="PRESTATAIRE">Paiement prestataire</option>
                    <option value="FRAIS_PRO">Frais professionnels</option>
                    <option value="REMBOURSEMENT">Remboursement</option>
                    <option value="FOURNISSEUR">Fournisseur</option>
                    <option value="PRELEVEMENT_OWNER">Mouvement OWNER</option>
                    <option value="AUTRE">Autre sortie</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white/60 mb-1">Bénéficiaire / Fournisseur *</label>
                  <input
                    type="text"
                    required
                    value={formData.beneficiaryName}
                    onChange={(e) => setFormData({ ...formData, beneficiaryName: e.target.value })}
                    className="w-full border border-white/15 bg-black px-3 py-2 text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/60 mb-1">Motif / Description *</label>
                <input
                  type="text"
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full border border-white/15 bg-black px-3 py-2 text-white outline-none"
                  placeholder="Ex: Facture d'honoraires, Loyer, Logiciel SaaS…"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-white/60 mb-1">Montant HT (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amountHt}
                    onChange={(e) => setFormData({ ...formData, amountHt: e.target.value })}
                    className="w-full border border-white/15 bg-black px-3 py-2 text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-white/60 mb-1">TVA (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amountTva}
                    onChange={(e) => setFormData({ ...formData, amountTva: e.target.value })}
                    className="w-full border border-white/15 bg-black px-3 py-2 text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-white/60 mb-1">Montant TTC (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amountTtc}
                    onChange={(e) => setFormData({ ...formData, amountTtc: e.target.value })}
                    className="w-full border border-white/15 bg-black px-3 py-2 text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-white/60 mb-1">Catégorie comptable</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border border-white/15 bg-black px-3 py-2 text-white outline-none"
                    placeholder="Ex: 604000 Achats, 622600 Honoraires…"
                  />
                </div>

                <div>
                  <label className="block text-white/60 mb-1">Référence justificatif / Facture</label>
                  <input
                    type="text"
                    value={formData.referenceNumber}
                    onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                    className="w-full border border-white/15 bg-black px-3 py-2 text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/60 mb-1">Lien vers la pièce justificative (URL)</label>
                <input
                  type="url"
                  value={formData.documentUrl}
                  onChange={(e) => setFormData({ ...formData, documentUrl: e.target.value })}
                  className="w-full border border-white/15 bg-black px-3 py-2 text-white outline-none"
                  placeholder="https://…"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="border border-white/20 px-4 py-2 text-white hover:bg-white/10"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="border border-[#c7a15a] bg-[#c7a15a] px-4 py-2 font-semibold text-black hover:bg-[#c7a15a]/90"
                >
                  Valider et Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit / Update Category */}
      {selectedOutflow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg border border-white/20 bg-[#111] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="font-serif text-lg text-white">Gérer / Compléter {selectedOutflow.outflowNumber}</h3>
              <button onClick={() => setSelectedOutflow(null)} className="text-white/50 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleUpdateOutflow} className="space-y-4 text-xs">
              <div>
                <p className="text-white/60">Bénéficiaire : <span className="text-white font-semibold">{selectedOutflow.beneficiaryName}</span></p>
                <p className="text-white/60">Motif : <span className="text-white">{selectedOutflow.reason}</span></p>
                <p className="text-[#c7a15a] font-mono mt-1 font-bold">
                  Total TTC: {selectedOutflow.amountTtc.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                </p>
              </div>

              <div>
                <label className="block text-white/60 mb-1">Catégorie comptable</label>
                <input
                  type="text"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full border border-white/15 bg-black px-3 py-2 text-white outline-none"
                  placeholder="Ex: 622600 Honoraires, 606400 Fournitures…"
                />
              </div>

              <div>
                <label className="block text-white/60 mb-1">URL Pièce Justificative</label>
                <input
                  type="url"
                  value={editDocUrl}
                  onChange={(e) => setEditDocUrl(e.target.value)}
                  className="w-full border border-white/15 bg-black px-3 py-2 text-white outline-none"
                  placeholder="https://…"
                />
              </div>

              <div>
                <label className="block text-white/60 mb-1">Statut</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full border border-white/15 bg-black px-3 py-2 text-white outline-none"
                >
                  <option value="A_COMPLETER">À compléter</option>
                  <option value="PAYE">Payé</option>
                  <option value="RAPPROCHE">Rapproché</option>
                  <option value="ANNULE">Annulé / Contrepassé</option>
                </select>
              </div>

              <div>
                <label className="block text-white/60 mb-1">Note de modification / Audit</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full border border-white/15 bg-black px-3 py-2 text-white outline-none"
                  placeholder="Motif de la correction..."
                />
              </div>

              {selectedOutflow.auditHistory && selectedOutflow.auditHistory.length > 0 && (
                <div className="border-t border-white/10 pt-3">
                  <p className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Historique des modifications :</p>
                  <div className="max-h-28 overflow-y-auto space-y-1 text-[10px] text-white/50 bg-black p-2 border border-white/5">
                    {selectedOutflow.auditHistory.map((h, idx) => (
                      <div key={idx} className="border-b border-white/5 pb-1">
                        <span className="text-[#c7a15a]">{new Date(h.timestamp).toLocaleString("fr-FR")}</span> - {h.action} par {h.actorRole}
                        {h.notes && <p className="italic text-white/40">{h.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedOutflow(null)}
                  className="border border-white/20 px-4 py-2 text-white hover:bg-white/10"
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  className="border border-[#c7a15a] bg-[#c7a15a] px-4 py-2 font-semibold text-black hover:bg-[#c7a15a]/90"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
