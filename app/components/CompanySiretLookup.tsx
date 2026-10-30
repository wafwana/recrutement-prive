"use client";

import { useState } from "react";

export type CompanyLookupResult = {
  siren?: string;
  siret?: string;
  name?: string;
  legalForm?: string;
  apeCode?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  website?: string;
  contactEmail?: string;
  sourceType: string;
  sourceUrl: string;
  collectedAt: string;
};

export function CompanySiretLookup({
  value,
  onChange,
  onFound,
  required = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onFound: (company: CompanyLookupResult) => void;
  required?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);

  async function lookup() {
    setMessage(null);
    setMessageIsError(false);
    const normalized = value.replace(/\D/g, "");
    if (normalized.length !== 9 && normalized.length !== 14) {
      setMessageIsError(true);
      setMessage("Saisissez un SIREN à 9 chiffres ou un SIRET à 14 chiffres.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch(`/api/company/siret?identifier=${encodeURIComponent(normalized)}`, {
        headers: { accept: "application/json" },
      });
      const data: unknown = await response.json().catch(() => null);
      const errorMessage =
        data && typeof data === "object" && "error" in data && typeof data.error === "string"
          ? data.error
          : null;

      if (!response.ok) {
        throw new Error(errorMessage || `La recherche a échoué (HTTP ${response.status}).`);
      }
      if (!data || typeof data !== "object" || !("siret" in data) || !("siren" in data) || !("name" in data)) {
        throw new Error("Le registre a renvoyé une réponse inattendue. Réessayez.");
      }

      const company = data as CompanyLookupResult;
      if (!company.siret || !/^\d{14}$/.test(company.siret)) {
        throw new Error("Le registre n’a pas fourni de SIRET d’établissement exploitable pour cette entreprise.");
      }
      onFound(company);
      setMessage(
        normalized.length === 9
          ? "Entreprise trouvée par SIREN. Le SIRET de son établissement principal a été récupéré ; vérifiez les informations avant validation."
          : "Établissement trouvé par SIRET. Vérifiez les informations avant validation.",
      );
    } catch (error) {
      setMessageIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "La recherche est momentanément impossible. Vérifiez votre connexion et réessayez.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="border border-[#c7a15a]/30 bg-[#c7a15a]/5 p-4">
      <label htmlFor="company-siret" className="block text-xs uppercase tracking-[0.18em] text-white/50">
        SIREN ou SIRET
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id="company-siret"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            if (message) setMessage(null);
          }}
          required={required}
          inputMode="numeric"
          autoComplete="off"
          maxLength={17}
          placeholder="9 chiffres (SIREN) ou 14 chiffres (SIRET)"
          aria-describedby="company-siret-help company-siret-status"
          className="min-w-0 flex-1 border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none"
        />
        <button
          type="button"
          onClick={lookup}
          disabled={pending}
          aria-busy={pending}
          className="border border-[#c7a15a] px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-[#c7a15a] disabled:cursor-wait disabled:opacity-50"
        >
          {pending ? "Recherche…" : "Préremplir"}
        </button>
      </div>
      <p id="company-siret-help" className="mt-2 text-[10px] leading-5 text-white/35">
        Entrez l’identifiant dont vous disposez. Avec un SIREN, le registre renvoie le SIRET de l’établissement principal lorsqu’il est disponible.
        Les informations proviennent d’une source publique et restent à vérifier avant validation.
      </p>
      <p
        id="company-siret-status"
        role="status"
        aria-live="polite"
        className={`mt-2 text-xs ${messageIsError ? "text-rose-300" : "text-white/70"}`}
      >
        {message || (pending ? "Interrogation du registre public des entreprises…" : "")}
      </p>
    </div>
  );
}
