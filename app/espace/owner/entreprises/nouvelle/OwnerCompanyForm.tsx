"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PHONE_COUNTRIES } from "@/lib/phone-countries";
import { CompanySiretLookup, type CompanyLookupResult } from "@/app/components/CompanySiretLookup";
import { createOwnerCompany, type CreateOwnerCompanyResult } from "./actions";

export default function OwnerCompanyForm() {
  const router = useRouter();
  const [siret, setSiret] = useState("");
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [country, setCountry] = useState("France");
  const [address, setAddress] = useState("");
  const [legalForm, setLegalForm] = useState("");
  const [apeCode, setApeCode] = useState("");
  const [siren, setSiren] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceCollectedAt, setSourceCollectedAt] = useState("");

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function applyLookup(data: CompanyLookupResult) {
    setSiret(data.siret || "");
    setSiren(data.siren || "");
    setName(data.name || "");
    setWebsite(data.website || "");
    if (data.contactEmail) setContactEmail(data.contactEmail);
    setCountry(data.country || "France");
    setAddress([data.address, [data.postalCode, data.city].filter(Boolean).join(" ")].filter(Boolean).join(", "));
    setLegalForm(data.legalForm || "");
    setApeCode(data.apeCode || "");
    setSourceType(data.sourceType || "");
    setSourceUrl(data.sourceUrl || "");
    setSourceCollectedAt(data.collectedAt || "");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setPending(true);

    try {
      const formData = new FormData(event.currentTarget);
      const res: CreateOwnerCompanyResult = await createOwnerCompany(formData);

      if (!res.ok) {
        setError(res.error || "Erreur lors de l'enregistrement.");
        return;
      }

      setSuccessMessage(`Entreprise "${res.companyName}" créée avec succès dans le référentiel.`);
      setTimeout(() => {
        router.push("/espace/owner/entreprises");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue lors de l'enregistrement.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 grid gap-5 border border-white/10 bg-[#111] p-7 md:grid-cols-2">
      {error ? (
        <div className="md:col-span-2 border border-rose-500/40 bg-rose-500/10 p-4 text-xs font-semibold text-rose-300">
          ⚠ {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="md:col-span-2 border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-300">
          ✓ {successMessage}
        </div>
      ) : null}

      <div className="md:col-span-2">
        <CompanySiretLookup value={siret} onChange={setSiret} onFound={applyLookup} />
      </div>
      <input type="hidden" name="siren" value={siren} />
      <input type="hidden" name="siret" value={siret} />
      <input type="hidden" name="sourceType" value={sourceType} />
      <input type="hidden" name="sourceUrl" value={sourceUrl} />
      <input type="hidden" name="sourceCollectedAt" value={sourceCollectedAt} />

      <label className="text-xs text-white/50">
        Nom de l'entreprise *
        <input
          name="name"
          required
          maxLength={180}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none"
        />
      </label>

      <label className="text-xs text-white/50">
        Site web
        <input
          name="website"
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://..."
          className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none"
        />
      </label>

      <label className="text-xs text-white/50">
        E-mail de contact (professionnel / public)
        <input
          name="contactEmail"
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder="contact@entreprise.com"
          className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none"
        />
      </label>

      <label className="text-xs text-white/50">
        Forme juridique
        <input
          name="legalForm"
          value={legalForm}
          onChange={(e) => setLegalForm(e.target.value)}
          className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none"
        />
      </label>

      <label className="text-xs text-white/50">
        Code APE / NAF
        <input
          name="apeCode"
          value={apeCode}
          onChange={(e) => setApeCode(e.target.value)}
          className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none"
        />
      </label>

      <label className="text-xs text-white/50 md:col-span-2">
        Adresse de l'établissement
        <input
          name="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none"
        />
      </label>

      <label className="text-xs text-white/50">
        Pays
        <select
          name="country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="mt-2 w-full border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none"
        >
          {PHONE_COUNTRIES.map(([item]) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <label className="text-xs text-white/50">
        Téléphone
        <input
          name="phone"
          type="tel"
          maxLength={40}
          className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none"
        />
      </label>

      <label className="text-xs text-white/50 md:col-span-2">
        Présentation / description
        <textarea
          name="description"
          rows={4}
          maxLength={2000}
          className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none"
        />
      </label>

      <div className="md:col-span-2 border-t border-white/10 pt-4 text-[10px] leading-5 text-white/35">
        Les données préremplies sont issues d'une source publique et doivent être vérifiées. Le SIRET identifie l'établissement ; l'accès d'un utilisateur à l'espace entreprise reste géré séparément par les habilitations de l'entreprise.
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 md:col-span-2">
        <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">Création réservée à l'OWNER · aucune donnée existante n'est remplacée.</p>
        <button
          type="submit"
          disabled={pending}
          className="border border-[#c7a15a] px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-[#c7a15a] hover:bg-[#c7a15a]/10 disabled:opacity-40"
        >
          {pending ? "Enregistrement en cours…" : "Enregistrer l'entreprise"}
        </button>
      </div>
    </form>
  );
}
