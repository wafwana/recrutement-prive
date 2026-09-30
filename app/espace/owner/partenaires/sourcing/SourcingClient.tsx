"use client";

import { useState } from "react";
import Link from "next/link";
import BackButton from "@/components/navigation/BackButton";
import {
  PARTNER_CATEGORIES,
  getCategoryLabel,
  getSubcategoryLabel,
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

export default function SourcingClient({ initialItems }: SourcingClientProps) {
  const [items, setItems] = useState(initialItems);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const [importingIndex, setImportingIndex] = useState<number | null>(null);
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

  async function handleImport(partnerItem: (typeof initialItems)[0], index: number) {
    setImportingIndex(index);
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

      setMessage({
        type: "success",
        text: `Organisme "${partnerItem.officialName}" importé avec succès sous le statut "À qualifier".`,
      });
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setImportingIndex(null);
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
            Sourcing et identification des réseaux d&apos;expatriés, universités, écoles, chambres de commerce et associations à l&apos;international.
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

      {/* Search Filter */}
      <form onSubmit={handleSearch} className="mt-8 border border-white/10 bg-[#111] p-6 space-y-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#F97316]">Recherche d&apos;organismes institutionnels</p>

        <div className="grid gap-4 sm:grid-cols-3">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Mots-clés (nom, sigle, réseau...)"
            className="border border-white/15 bg-black/60 px-3 py-2 text-xs text-white"
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border border-white/15 bg-black/60 px-3 py-2 text-xs text-white"
          >
            <option value="">Toutes les catégories</option>
            {PARTNER_CATEGORIES.map((cat) => (
              <option key={cat.code} value={cat.code}>
                {cat.label}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Pays / Région..."
            className="border border-white/15 bg-black/60 px-3 py-2 text-xs text-white"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="border border-[#F97316] bg-[#F97316] px-6 py-2.5 text-xs font-semibold text-black uppercase tracking-wider"
          >
            {loading ? "Recherche..." : "Lancer le Sourcing"}
          </button>
        </div>
      </form>

      {/* Results List */}
      <div className="mt-8 space-y-4">
        {items.map((item, index) => (
          <article key={index} className="border border-white/10 bg-[#111] p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
                onClick={() => handleImport(item, index)}
                disabled={importingIndex === index}
                className="border border-[#c7a15a] bg-[#c7a15a]/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#c7a15a] hover:bg-[#c7a15a]/20 disabled:opacity-50"
              >
                {importingIndex === index ? "Importation..." : "+ Importer comme Partenaire"}
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
