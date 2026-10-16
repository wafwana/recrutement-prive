"use client";

import { useState } from "react";
import Link from "next/link";
import BackButton from "@/components/navigation/BackButton";
import {
  PARTNER_CATEGORIES,
  getCategoryLabel,
} from "@/lib/partenaires/taxonomy";

export interface SourcingClientProps {
  initialItems: Array<{
    officialName: string;
    usualName?: string;
    category: string;
    subCategory?: string;
    partnerType?: string;
    country?: string;
    region?: string;
    city?: string;
    website?: string;
    publicContactEmail?: string;
    publicContactPhone?: string;
    languages?: string[];
    sectors?: string[];
    targetAudience?: string[];
    collaborationTypes?: string[];
    source: string;
    sourceUrl?: string;
    discoveredAt: string;
    notes?: string;
  }>;
}

function partnerKey(item: SourcingClientProps["initialItems"][number]): string {
  return `${item.source}:${item.officialName.trim().toLocaleLowerCase("fr-FR")}`;
}

export default function SourcingClient({ initialItems }: SourcingClientProps) {
  const [items, setItems] = useState(initialItems);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const [importingKey, setImportingKey] = useState<string | null>(null);
  const [importedKeys, setImportedKeys] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (category) params.set("category", category);
      if (country) params.set("country", country);

      const res = await fetch(`/api/owner/partenaires/sourcing?${params.toString()}`);
      if (!res.ok) throw new Error("Erreur lors de la recherche.");

      const data = await res.json();
      setItems(data.items);
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setLoading(false);
    }
  }

  function clearFilters() {
    setQ("");
    setCategory("");
    setCountry("");
    setItems(initialItems);
    setMessage(null);
  }

  async function handleImport(partnerItem: (typeof initialItems)[0]) {
    const key = partnerKey(partnerItem);
    if (importedKeys.has(key)) return;
    setImportingKey(key);
    setMessage(null);

    try {
      const res = await fetch("/api/owner/partenaires/sourcing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner: partnerItem,
          initialStatus: "TO_QUALIFY",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'importation.");
      }

      setImportedKeys((previous) => new Set(previous).add(key));
      setMessage({
        type: "success",
        text: `Organisme "${partnerItem.officialName}" importé avec succès sous le statut "À qualifier".`,
      });
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setImportingKey(null);
    }
  }

  return (
    <section className="mx-auto w-[min(1280px,calc(100%-40px))] py-12 md:w-[min(1280px,calc(100%-72px))] md:py-20">
      <BackButton />

      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#F97316]">Owner · Découverte & Sourcing</p>
          <h1 className="mt-4 font-serif text-4xl sm:text-5xl">Organismes & Réseaux Découverts</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/50">
            Répertoire institutionnel préqualifié pour identifier les réseaux d&apos;expatriés, universités, écoles, chambres de commerce et associations utiles au recrutement international.
          </p>
        </div>
        <Link
          href="/espace/owner/partenaires"
          className="border border-[#c7a15a] bg-[#c7a15a]/10 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#c7a15a]"
        >
          ← Retour aux Partenaires
        </Link>
      </div>

      {message && (
        <div
          className={`mt-6 border p-4 text-xs ${
            message.type === "success"
              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/50 bg-red-500/10 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mt-8 border border-white/10 bg-[#111] p-4 text-xs leading-6 text-white/55">
        <p><strong className="text-white">Mode de recherche :</strong> répertoire intégré filtré localement via l&apos;API RP. Ce bouton ne lance pas de collecte Web en direct ; les fiches doivent être vérifiées sur leur site officiel avant toute prise de contact.</p>
        <p className="mt-2 text-white/40">Référentiel affiché : {items.length} organisme(s). Les sources et contacts sont des indications de découverte, pas une validation de partenariat.</p>
      </div>

      <form onSubmit={handleSearch} className="mt-4 border border-white/10 bg-[#111] p-6 space-y-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#F97316]">Filtrer le répertoire institutionnel</p>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="partner-directory-query" className="mb-1 block text-[10px] uppercase tracking-[0.12em] text-white/45">Mots-clés</label>
            <input
              id="partner-directory-query"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nom, sigle, réseau, ville..."
              className="w-full border border-white/15 bg-black/60 px-3 py-2 text-xs text-white outline-none focus:border-[#F97316]"
            />
          </div>

          <div>
            <label htmlFor="partner-directory-category" className="mb-1 block text-[10px] uppercase tracking-[0.12em] text-white/45">Catégorie</label>
            <select
              id="partner-directory-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-white/15 bg-black/60 px-3 py-2 text-xs text-white outline-none focus:border-[#F97316]"
            >
              <option value="">Toutes les catégories</option>
              {PARTNER_CATEGORIES.map((cat) => (
                <option key={cat.code} value={cat.code}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="partner-directory-country" className="mb-1 block text-[10px] uppercase tracking-[0.12em] text-white/45">Pays</label>
            <input
              id="partner-directory-country"
              type="search"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="France, Inde, Émirats..."
              className="w-full border border-white/15 bg-black/60 px-3 py-2 text-xs text-white outline-none focus:border-[#F97316]"
            />
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={clearFilters}
            disabled={loading || (!q && !category && !country)}
            className="border border-white/15 px-5 py-2.5 text-xs uppercase tracking-wider text-white/70 hover:border-white/35 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Effacer les filtres
          </button>
          <button
            type="submit"
            disabled={loading}
            className="border border-[#F97316] bg-[#F97316] px-6 py-2.5 text-xs font-semibold text-black uppercase tracking-wider disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? "Recherche..." : "Filtrer le répertoire"}
          </button>
        </div>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-white/50">
        <p role="status" aria-live="polite">{items.length} résultat(s) affiché(s).</p>
        <p className="text-white/35">{initialItems.length} fiche(s) dans le répertoire initial</p>
      </div>

      <div className="mt-4 space-y-4">
        {items.map((item) => (
          <article key={partnerKey(item)} className="border border-white/10 bg-[#111] p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2 max-w-3xl">
              <div className="flex items-center gap-3">
                <span className="border border-[#F97316]/40 bg-[#F97316]/10 px-2.5 py-0.5 text-[9px] uppercase tracking-wider text-[#F97316]">
                  {getCategoryLabel(item.category)}
                </span>
                <span className="text-[10px] font-mono text-white/40">Source : {item.source}</span>
              </div>

              <h2 className="font-serif text-xl text-white">
                {item.officialName} {item.usualName ? `(${item.usualName})` : ""}
              </h2>

              <p className="text-xs text-white/60">{item.notes}</p>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/40 pt-1">
                {item.country && <span>📍 {item.country}</span>}
                {item.website && (
                  <a href={item.website} target="_blank" rel="noreferrer" className="text-[#F97316] hover:underline">
                    🔗 {item.website}
                  </a>
                )}
                {item.publicContactEmail && <span>📧 {item.publicContactEmail}</span>}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void handleImport(item)}
                disabled={importingKey === partnerKey(item) || importedKeys.has(partnerKey(item))}
                className="border border-[#c7a15a] bg-[#c7a15a]/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#c7a15a] hover:bg-[#c7a15a]/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {importingKey === partnerKey(item)
                  ? "Importation..."
                  : importedKeys.has(partnerKey(item))
                    ? "Importé pendant cette session"
                    : "+ Importer comme partenaire"}
              </button>
            </div>
          </article>
        ))}

        {items.length === 0 && (
          <div className="border border-white/10 bg-[#111] py-16 text-center text-sm text-white/40">
            Aucun organisme découvert correspondant à votre recherche.
          </div>
        )}
      </div>
    </section>
  );
}
