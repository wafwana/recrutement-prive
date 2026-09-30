"use client";

import { useState } from "react";
import Link from "next/link";
import BackButton from "@/components/navigation/BackButton";
import {
  PARTNER_STATUSES,
  AGREEMENT_TYPES,
  AGREEMENT_STATUSES,
  getCategoryLabel,
  getSubcategoryLabel,
  getStatusLabel,
  getAgreementTypeLabel,
  getAgreementStatusLabel,
  PartnerStatusCode,
} from "@/lib/partenaires/taxonomy";

export interface PartnerDetailProps {
  partner: {
    id: string;
    officialName: string;
    usualName: string | null;
    category: string;
    subCategory: string | null;
    partnerType: string | null;
    status: string;
    country: string | null;
    region: string | null;
    city: string | null;
    website: string | null;
    institutionalAddress: string | null;
    publicContactEmail: string | null;
    publicContactPhone: string | null;
    languages: any;
    sectors: any;
    professions: any;
    targetAudience: any;
    skills: any;
    collaborationTypes: any;
    potentialNeed: string | null;
    interest: string | null;
    coveredZones: any;
    priority: string;
    assignedOwner: string | null;
    lastQualifiedAt: string | null;
    lastContactAt: string | null;
    notes: string | null;
    source: string;
    sourceUrl: string | null;
    createdAt: string;
    updatedAt: string;
    contacts: Array<{
      id: string;
      name: string;
      roleTitle: string | null;
      email: string | null;
      phone: string | null;
      source: string | null;
      notes: string | null;
      createdAt: string;
    }>;
    agreements: Array<{
      id: string;
      title: string;
      agreementType: string;
      status: string;
      startDate: string | null;
      endDate: string | null;
      clauses: string | null;
      documentUrl: string | null;
      createdAt: string;
    }>;
    history: Array<{
      id: string;
      actorName: string | null;
      action: string;
      fromStatus: string | null;
      toStatus: string | null;
      details: any;
      createdAt: string;
    }>;
  };
  currentUserRole: string;
}

export default function PartnerDetailClient({ partner: initialPartner, currentUserRole }: PartnerDetailProps) {
  const [partner, setPartner] = useState(initialPartner);
  const [activeTab, setActiveTab] = useState<"ID" | "QUALIF" | "CONTACTS" | "ACCORDS" | "HISTORY">("ID");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [showContactModal, setShowContactModal] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactNotes, setContactNotes] = useState("");

  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [agreementTitle, setAgreementTitle] = useState("");
  const [agreementType, setAgreementType] = useState("CONVENTION_PARTENARIAT");
  const [agreementStatus, setAgreementStatus] = useState("PROJECT");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [clauses, setClauses] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");

  async function reloadPartner() {
    try {
      const res = await fetch(`/api/owner/partenaires/${partner.id}`);
      if (res.ok) {
        const data = await res.json();
        setPartner(data.partner);
      }
    } catch {
      // ignore
    }
  }

  async function handleStatusChange(newStatus: PartnerStatusCode) {
    if (newStatus === "VALIDATED_PARTNER" && currentUserRole !== "OWNER") {
      setMessage({
        type: "error",
        text: "Seul l'OWNER dispose du pouvoir de valider officiellement un partenariat.",
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/owner/partenaires/${partner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors du changement de statut.");
      }

      setPartner(data.partner);
      setMessage({ type: "success", text: `Statut mis à jour : ${getStatusLabel(newStatus)}` });
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Erreur lors de la mise à jour" });
    } finally {
      setLoading(false);
    }
  }

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault();
    if (!contactName.trim()) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/owner/partenaires/${partner.id}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contactName,
          roleTitle: contactRole,
          email: contactEmail,
          phone: contactPhone,
          notes: contactNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'ajout du contact");

      setShowContactModal(false);
      setContactName("");
      setContactRole("");
      setContactEmail("");
      setContactPhone("");
      setContactNotes("");
      await reloadPartner();
      setMessage({ type: "success", text: "Contact ajouté avec succès." });
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteContact(contactId: string) {
    if (!confirm("Voulez-vous supprimer ce contact ?")) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/owner/partenaires/${partner.id}/contacts?contactId=${contactId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Erreur lors de la suppression.");

      await reloadPartner();
      setMessage({ type: "success", text: "Contact supprimé." });
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setLoading(false);
    }
  }

  async function handleAddAgreement(e: React.FormEvent) {
    e.preventDefault();
    if (!agreementTitle.trim()) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/owner/partenaires/${partner.id}/accords`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: agreementTitle,
          agreementType,
          status: agreementStatus,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          clauses,
          documentUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur création accord.");

      setShowAgreementModal(false);
      setAgreementTitle("");
      setClauses("");
      setDocumentUrl("");
      await reloadPartner();
      setMessage({ type: "success", text: "Accord enregistré avec succès." });
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteAgreement(accordId: string) {
    if (!confirm("Voulez-vous supprimer cet accord ?")) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/owner/partenaires/${partner.id}/accords/${accordId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Erreur suppression.");

      await reloadPartner();
      setMessage({ type: "success", text: "Accord supprimé." });
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setLoading(false);
    }
  }

  const formatList = (val: any) => {
    if (Array.isArray(val)) return val.join(", ");
    if (typeof val === "string") return val;
    return "—";
  };

  return (
    <section className="mx-auto w-[min(1280px,calc(100%-40px))] py-12 md:w-[min(1280px,calc(100%-72px))] md:py-20">
      <BackButton />

      <div className="border border-white/10 bg-[#111] p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <span className="border border-[#c7a15a]/40 bg-[#c7a15a]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#c7a15a]">
              {getCategoryLabel(partner.category)}
            </span>
            <h1 className="mt-3 font-serif text-3xl sm:text-4xl text-white font-normal">
              {partner.officialName}
            </h1>
            {partner.usualName && <p className="mt-1 text-sm text-white/50">({partner.usualName})</p>}
            <p className="mt-2 text-xs text-white/40">
              📍 {[partner.city, partner.region, partner.country].filter(Boolean).join(", ") || "Localisation non renseignée"}
            </p>
          </div>

          <div className="flex flex-col items-end gap-3">
            <span
              className={`border px-4 py-2 text-xs font-semibold uppercase tracking-widest ${
                partner.status === "VALIDATED_PARTNER"
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                  : partner.status === "AGREEMENT_IN_PREPARATION" || partner.status === "IN_DISCUSSION"
                  ? "border-[#F97316] bg-[#F97316]/10 text-[#F97316]"
                  : "border-white/30 bg-white/5 text-white/70"
              }`}
            >
              {getStatusLabel(partner.status)}
            </span>
            <p className="text-[10px] text-white/35">Priorité : {partner.priority}</p>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-3">Changer le statut du partenaire :</p>
          <div className="flex flex-wrap gap-2">
            {PARTNER_STATUSES.map((st) => {
              const isCurrent = partner.status === st.code;
              const isVal = st.code === "VALIDATED_PARTNER";
              return (
                <button
                  key={st.code}
                  onClick={() => handleStatusChange(st.code as PartnerStatusCode)}
                  disabled={loading || isCurrent}
                  className={`border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] transition ${
                    isCurrent
                      ? "border-[#c7a15a] bg-[#c7a15a] text-black font-semibold cursor-default"
                      : isVal
                      ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                      : "border-white/20 text-white/60 hover:border-white/40 hover:text-white"
                  }`}
                >
                  {isVal ? "★ " : ""}
                  {st.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`mt-4 border p-4 text-xs ${
            message.type === "success"
              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/50 bg-red-500/10 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mt-8 flex border-b border-white/10">
        <button
          onClick={() => setActiveTab("ID")}
          className={`px-6 py-3.5 text-xs uppercase tracking-[0.16em] transition ${
            activeTab === "ID"
              ? "border-b-2 border-[#c7a15a] text-[#c7a15a] font-semibold"
              : "text-white/45 hover:text-white"
          }`}
        >
          Identification & Coordonnées
        </button>
        <button
          onClick={() => setActiveTab("QUALIF")}
          className={`px-6 py-3.5 text-xs uppercase tracking-[0.16em] transition ${
            activeTab === "QUALIF"
              ? "border-b-2 border-[#c7a15a] text-[#c7a15a] font-semibold"
              : "text-white/45 hover:text-white"
          }`}
        >
          Qualification & Secteurs
        </button>
        <button
          onClick={() => setActiveTab("CONTACTS")}
          className={`px-6 py-3.5 text-xs uppercase tracking-[0.16em] transition ${
            activeTab === "CONTACTS"
              ? "border-b-2 border-[#c7a15a] text-[#c7a15a] font-semibold"
              : "text-white/45 hover:text-white"
          }`}
        >
          Contacts ({partner.contacts.length})
        </button>
        <button
          onClick={() => setActiveTab("ACCORDS")}
          className={`px-6 py-3.5 text-xs uppercase tracking-[0.16em] transition ${
            activeTab === "ACCORDS"
              ? "border-b-2 border-[#c7a15a] text-[#c7a15a] font-semibold"
              : "text-white/45 hover:text-white"
          }`}
        >
          Accords & Conventions ({partner.agreements.length})
        </button>
        <button
          onClick={() => setActiveTab("HISTORY")}
          className={`px-6 py-3.5 text-xs uppercase tracking-[0.16em] transition ${
            activeTab === "HISTORY"
              ? "border-b-2 border-[#c7a15a] text-[#c7a15a] font-semibold"
              : "text-white/45 hover:text-white"
          }`}
        >
          Historique ({partner.history.length})
        </button>
      </div>

      <div className="mt-8">
        {activeTab === "ID" && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="border border-white/10 bg-[#111] p-6 space-y-4">
              <h2 className="font-serif text-lg text-[#c7a15a]">Identification de l&apos;organisme</h2>

              <div className="space-y-3 text-xs leading-6">
                <div>
                  <span className="text-white/40">Nom officiel :</span>
                  <p className="text-white font-medium">{partner.officialName}</p>
                </div>
                <div>
                  <span className="text-white/40">Nom usuel / Sigle :</span>
                  <p className="text-white">{partner.usualName || "—"}</p>
                </div>
                <div>
                  <span className="text-white/40">Catégorie principale :</span>
                  <p className="text-white">{getCategoryLabel(partner.category)}</p>
                </div>
                <div>
                  <span className="text-white/40">Sous-catégorie :</span>
                  <p className="text-white">{getSubcategoryLabel(partner.category, partner.subCategory)}</p>
                </div>
                <div>
                  <span className="text-white/40">Type de structure :</span>
                  <p className="text-white">{partner.partnerType || "Non spécifié"}</p>
                </div>
                <div>
                  <span className="text-white/40">Source de découverte :</span>
                  <p className="text-[#F97316] font-mono text-[11px]">{partner.source}</p>
                </div>
              </div>
            </div>

            <div className="border border-white/10 bg-[#111] p-6 space-y-4">
              <h2 className="font-serif text-lg text-[#c7a15a]">Localisation & Coordonnées Publiques</h2>

              <div className="space-y-3 text-xs leading-6">
                <div>
                  <span className="text-white/40">Pays :</span>
                  <p className="text-white">{partner.country || "—"}</p>
                </div>
                <div>
                  <span className="text-white/40">Région / Ville :</span>
                  <p className="text-white">{[partner.region, partner.city].filter(Boolean).join(", ") || "—"}</p>
                </div>
                <div>
                  <span className="text-white/40">Adresse institutionnelle :</span>
                  <p className="text-white">{partner.institutionalAddress || "—"}</p>
                </div>
                <div>
                  <span className="text-white/40">Site Web institutionnel :</span>
                  {partner.website ? (
                    <a href={partner.website} target="_blank" rel="noreferrer" className="block text-[#F97316] hover:underline">
                      {partner.website}
                    </a>
                  ) : (
                    <p className="text-white/40">—</p>
                  )}
                </div>
                <div>
                  <span className="text-white/40">E-mail public pro :</span>
                  <p className="text-white">{partner.publicContactEmail || "—"}</p>
                </div>
                <div>
                  <span className="text-white/40">Téléphone public pro :</span>
                  <p className="text-white">{partner.publicContactPhone || "—"}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "QUALIF" && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="border border-white/10 bg-[#111] p-6 space-y-4">
              <h2 className="font-serif text-lg text-[#c7a15a]">Périmètre & Secteurs d&apos;expertise</h2>

              <div className="space-y-3 text-xs leading-6">
                <div>
                  <span className="text-white/40">Langues pratiquées :</span>
                  <p className="text-white">{formatList(partner.languages)}</p>
                </div>
                <div>
                  <span className="text-white/40">Secteurs d&apos;activité :</span>
                  <p className="text-white">{formatList(partner.sectors)}</p>
                </div>
                <div>
                  <span className="text-white/40">Métiers & Spécialités :</span>
                  <p className="text-white">{formatList(partner.professions)}</p>
                </div>
                <div>
                  <span className="text-white/40">Publics / Profils concernés :</span>
                  <p className="text-white">{formatList(partner.targetAudience)}</p>
                </div>
                <div>
                  <span className="text-white/40">Types de collaboration :</span>
                  <p className="text-white">{formatList(partner.collaborationTypes)}</p>
                </div>
              </div>
            </div>

            <div className="border border-white/10 bg-[#111] p-6 space-y-4">
              <h2 className="font-serif text-lg text-[#c7a15a]">Intérêt & Suivi interne</h2>

              <div className="space-y-3 text-xs leading-6">
                <div>
                  <span className="text-white/40">Besoin potentiel identifié :</span>
                  <p className="text-white/90">{partner.potentialNeed || "—"}</p>
                </div>
                <div>
                  <span className="text-white/40">Intérêt pour Recrutement Privé :</span>
                  <p className="text-white/90">{partner.interest || "—"}</p>
                </div>
                <div>
                  <span className="text-white/40">Responsable RP attribué :</span>
                  <p className="text-[#c7a15a]">{partner.assignedOwner || "Non attribué"}</p>
                </div>
                <div>
                  <span className="text-white/40">Notes internes :</span>
                  <p className="text-white/80 whitespace-pre-wrap">{partner.notes || "Aucune note."}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "CONTACTS" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="font-serif text-xl text-[#c7a15a]">Interlocuteurs & Contacts associés</h2>
              <button
                onClick={() => setShowContactModal(true)}
                className="border border-[#c7a15a] bg-[#c7a15a]/10 px-4 py-2 text-xs uppercase tracking-[0.14em] text-[#c7a15a] hover:bg-[#c7a15a]/20"
              >
                + Ajouter un contact
              </button>
            </div>

            {showContactModal && (
              <form onSubmit={handleAddContact} className="border border-[#c7a15a]/30 bg-[#181818] p-6 space-y-4">
                <h3 className="font-serif text-base text-[#c7a15a]">Nouveau Contact</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Nom complet *"
                    className="border border-white/15 bg-black/60 px-3 py-2 text-xs text-white"
                    required
                  />
                  <input
                    type="text"
                    value={contactRole}
                    onChange={(e) => setContactRole(e.target.value)}
                    placeholder="Fonction / Poste"
                    className="border border-white/15 bg-black/60 px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="E-mail professionnel"
                    className="border border-white/15 bg-black/60 px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="Téléphone professionnel"
                    className="border border-white/15 bg-black/60 px-3 py-2 text-xs text-white"
                  />
                </div>
                <textarea
                  value={contactNotes}
                  onChange={(e) => setContactNotes(e.target.value)}
                  placeholder="Notes sur l'interlocuteur..."
                  rows={2}
                  className="w-full border border-white/15 bg-black/60 p-3 text-xs text-white"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowContactModal(false)}
                    className="border border-white/20 px-3 py-2 text-xs text-white/60"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="border border-[#c7a15a] bg-[#c7a15a] px-4 py-2 text-xs text-black font-semibold"
                  >
                    Enregistrer contact
                  </button>
                </div>
              </form>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {partner.contacts.map((contact) => (
                <div key={contact.id} className="border border-white/10 bg-[#111] p-5 flex flex-col justify-between">
                  <div>
                    <h3 className="font-serif text-lg text-white font-medium">{contact.name}</h3>
                    {contact.roleTitle && <p className="text-xs text-[#c7a15a] mt-0.5">{contact.roleTitle}</p>}
                    <div className="mt-4 space-y-1 text-xs text-white/60">
                      {contact.email && <p>📧 {contact.email}</p>}
                      {contact.phone && <p>📞 {contact.phone}</p>}
                      {contact.notes && <p className="mt-2 text-white/40 italic">{contact.notes}</p>}
                    </div>
                  </div>
                  <div className="mt-5 border-t border-white/10 pt-3 flex justify-end">
                    <button
                      onClick={() => handleDeleteContact(contact.id)}
                      className="text-[10px] uppercase tracking-wider text-red-400 hover:underline"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}

              {partner.contacts.length === 0 && (
                <p className="text-xs text-white/40 italic py-6">Aucun contact spécifique enregistré pour l&apos;instant.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "ACCORDS" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="font-serif text-xl text-[#c7a15a]">Accords, Conventions & Chartes</h2>
              <button
                onClick={() => setShowAgreementModal(true)}
                className="border border-[#F97316] bg-[#F97316]/10 px-4 py-2 text-xs uppercase tracking-[0.14em] text-[#F97316] hover:bg-[#F97316]/20"
              >
                + Nouvel accord / convention
              </button>
            </div>

            {showAgreementModal && (
              <form onSubmit={handleAddAgreement} className="border border-[#F97316]/30 bg-[#181818] p-6 space-y-4">
                <h3 className="font-serif text-base text-[#F97316]">Enregistrer un Accord / Convention</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    type="text"
                    value={agreementTitle}
                    onChange={(e) => setAgreementTitle(e.target.value)}
                    placeholder="Intitulé de l'accord *"
                    className="border border-white/15 bg-black/60 px-3 py-2 text-xs text-white"
                    required
                  />
                  <select
                    value={agreementType}
                    onChange={(e) => setAgreementType(e.target.value)}
                    className="border border-white/15 bg-black/60 px-3 py-2 text-xs text-white"
                  >
                    {AGREEMENT_TYPES.map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <select
                    value={agreementStatus}
                    onChange={(e) => setAgreementStatus(e.target.value)}
                    className="border border-white/15 bg-black/60 px-3 py-2 text-xs text-white"
                  >
                    {AGREEMENT_STATUSES.map((st) => (
                      <option key={st.code} value={st.code}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                  <div>
                    <label className="block text-[9px] uppercase text-white/40">Date effet / début</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full border border-white/15 bg-black/60 px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase text-white/40">Date échéance / fin</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full border border-white/15 bg-black/60 px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                <textarea
                  value={clauses}
                  onChange={(e) => setClauses(e.target.value)}
                  placeholder="Clauses principales, modalités, engagements réciproques..."
                  rows={3}
                  className="w-full border border-white/15 bg-black/60 p-3 text-xs text-white"
                />

                <input
                  type="url"
                  value={documentUrl}
                  onChange={(e) => setDocumentUrl(e.target.value)}
                  placeholder="Lien vers le document numérisé (ex: https://...)"
                  className="w-full border border-white/15 bg-black/60 px-3 py-2 text-xs text-white"
                />

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAgreementModal(false)}
                    className="border border-white/20 px-3 py-2 text-xs text-white/60"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="border border-[#F97316] bg-[#F97316] px-4 py-2 text-xs text-black font-semibold"
                  >
                    Créer l&apos;accord
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-4">
              {partner.agreements.map((agreement) => (
                <div key={agreement.id} className="border border-white/10 bg-[#111] p-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="border border-[#F97316]/40 bg-[#F97316]/10 px-2.5 py-0.5 text-[9px] uppercase tracking-wider text-[#F97316]">
                        {getAgreementTypeLabel(agreement.agreementType)}
                      </span>
                      <span className="border border-white/20 px-2 py-0.5 text-[9px] uppercase tracking-wider text-white/70">
                        {getAgreementStatusLabel(agreement.status)}
                      </span>
                    </div>
                    <h3 className="font-serif text-lg text-white">{agreement.title}</h3>
                    {agreement.clauses && <p className="text-xs text-white/60 line-clamp-2">{agreement.clauses}</p>}
                    <p className="text-[10px] text-white/40">
                      Période : {agreement.startDate ? new Date(agreement.startDate).toLocaleDateString("fr-FR") : "Indéterminée"}
                      {" → "}
                      {agreement.endDate ? new Date(agreement.endDate).toLocaleDateString("fr-FR") : "Reconduction"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {agreement.documentUrl && (
                      <a
                        href={agreement.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="border border-white/20 px-3 py-2 text-xs text-[#c7a15a] hover:underline"
                      >
                        Voir document
                      </a>
                    )}
                    <button
                      onClick={() => handleDeleteAgreement(agreement.id)}
                      className="border border-red-500/30 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}

              {partner.agreements.length === 0 && (
                <p className="text-xs text-white/40 italic py-6">Aucun accord ou convention formel enregistré.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "HISTORY" && (
          <div className="border border-white/10 bg-[#111] p-6 space-y-4">
            <h2 className="font-serif text-xl text-[#c7a15a] border-b border-white/10 pb-3">
              Historique des événements & modifications
            </h2>

            <div className="space-y-3">
              {partner.history.map((log) => (
                <div key={log.id} className="border-l-2 border-[#c7a15a] pl-4 py-2 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-white/80">{log.action}</span>
                    <span className="text-[10px] text-white/35">
                      {new Date(log.createdAt).toLocaleString("fr-FR")}
                    </span>
                  </div>
                  <p className="text-white/50">
                    Par : <strong className="text-white/70">{log.actorName || "Système"}</strong>
                  </p>
                  {log.fromStatus && log.toStatus && (
                    <p className="text-white/60">
                      Statut : <span className="text-white/40">{log.fromStatus}</span> →{" "}
                      <span className="text-[#c7a15a]">{log.toStatus}</span>
                    </p>
                  )}
                  {log.details && (
                    <p className="text-white/40 font-mono text-[11px]">{JSON.stringify(log.details)}</p>
                  )}
                </div>
              ))}

              {partner.history.length === 0 && (
                <p className="text-xs text-white/40 italic">Aucun historique enregistré.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
