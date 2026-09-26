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
  sourceType: string;
  sourceUrl: string;
  collectedAt: string;
};

export function CompanySiretLookup({
  value,
  onChange,
  onFound,
}: {
  value: string;
  onChange: (value: string) => void;
  onFound: (company: CompanyLookupResult) => void;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function lookup() {
    setMessage(null);
    const normalized = value.replace(/\D/g, "");
    if (normalized.length !== 14) {
      setMessage("Le SIRET doit comporter 14 chiffres.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch(`/api/company/siret?siret=${encodeURIComponent(normalized)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Recherche impossible.");
      onFound(data);
      setMessage("Informations publiques récupérées. Vérifiez-les avant validation.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Recherche impossible.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="border border-[#c7a15a]/30 bg-[#c7a15a]/5 p-4">
      <label className="block text-xs uppercase tracking-[0.18em] text-white/50">
        SIRET
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            inputMode="numeric"
            maxLength={17}
            placeholder="14 chiffres"
            className="min-w-0 flex-1 border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none"
          />
          <button type="button" onClick={lookup} disabled={pending} className="border border-[#c7a15a] px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-[#c7a15a] disabled:opacity-50">
            {pending ? "Recherche…" : "Préremplir"}
          </button>
        </div>
      </label>
      <p className="mt-2 text-[10px] leading-5 text-white/35">
        Les informations préremplies proviennent d'une source publique et restent à vérifier par l'entreprise.
      </p>
      {message ? <p className="mt-2 text-xs text-white/55">{message}</p> : null}
    </div>
  );
}
