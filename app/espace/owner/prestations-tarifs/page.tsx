"use client";

import { useEffect, useState } from "react";

type Item = {
  id: string; name: string; description: string; pricingType: string; price: number;
  currency: string; conditions: string; active: boolean; visibility: string;
};

const emptyItem = (): Item => ({ id: `prestation-${Date.now()}`, name: "", description: "", pricingType: "PERCENTAGE", price: 0, currency: "EUR", conditions: "", active: true, visibility: "PUBLIC" });

export default function PrestationsTarifsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/owner/prestations-tarifs", { cache: "no-store" });
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function update(id: string, field: keyof Item, value: string | number | boolean) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
  }

  async function save() {
    setSaving(true); setMessage("");
    const res = await fetch("/api/owner/prestations-tarifs", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
    const data = await res.json();
    setSaving(false);
    setMessage(res.ok ? "Modifications enregistrées." : (data.error || "Erreur d'enregistrement."));
    if (res.ok) setItems(data.items || items);
  }

  if (loading) return <section className="mx-auto w-[min(1180px,calc(100%-40px))] py-20"><p className="text-white/50">Chargement des prestations…</p></section>;

  return (
    <section className="mx-auto w-[min(1280px,calc(100%-40px))] py-12 md:w-[min(1280px,calc(100%-72px))] md:py-20">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Owner · Prestations & tarifs</p>
          <h1 className="mt-4 font-serif text-4xl sm:text-5xl">Une grille commerciale modifiable à tout moment.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/50">Les tarifs sont stockés comme configuration métier et non codés en dur dans l'interface. Tu peux activer, désactiver ou modifier une prestation sans modifier le code.</p>
        </div>
        <button onClick={save} disabled={saving} className="border border-[#c7a15a]/50 px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-[#c7a15a] disabled:opacity-40">{saving ? "Enregistrement…" : "Enregistrer"}</button>
      </div>

      {message && <p className="mt-6 border border-white/10 px-4 py-3 text-sm text-white/60">{message}</p>}

      <div className="mt-10 space-y-5">
        {items.map((item) => (
          <article key={item.id} className="border border-white/10 bg-[#111] p-6">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <label className="text-xs text-white/45">Nom<input value={item.name} onChange={(e) => update(item.id, "name", e.target.value)} className="mt-2 w-full border border-white/10 bg-black px-3 py-3 text-sm text-white outline-none" /></label>
              <label className="text-xs text-white/45">Type de tarification<select value={item.pricingType} onChange={(e) => update(item.id, "pricingType", e.target.value)} className="mt-2 w-full border border-white/10 bg-black px-3 py-3 text-sm text-white outline-none"><option value="PERCENTAGE">Pourcentage salaire</option><option value="FIXED">Forfait</option><option value="SUCCESS_FEE">Success fee</option><option value="CUSTOM">Personnalisé</option></select></label>
              <label className="text-xs text-white/45">Prix<input type="number" min="0" step="0.1" value={item.price} onChange={(e) => update(item.id, "price", Number(e.target.value))} className="mt-2 w-full border border-white/10 bg-black px-3 py-3 text-sm text-white outline-none" /></label>
              <label className="text-xs text-white/45">Devise<input value={item.currency} onChange={(e) => update(item.id, "currency", e.target.value.toUpperCase())} className="mt-2 w-full border border-white/10 bg-black px-3 py-3 text-sm text-white outline-none" /></label>
              <label className="text-xs text-white/45 md:col-span-2">Description<textarea value={item.description} onChange={(e) => update(item.id, "description", e.target.value)} rows={3} className="mt-2 w-full border border-white/10 bg-black px-3 py-3 text-sm text-white outline-none" /></label>
              <label className="text-xs text-white/45 md:col-span-2">Conditions<textarea value={item.conditions} onChange={(e) => update(item.id, "conditions", e.target.value)} rows={3} className="mt-2 w-full border border-white/10 bg-black px-3 py-3 text-sm text-white outline-none" /></label>
              <label className="text-xs text-white/45">Visibilité<select value={item.visibility} onChange={(e) => update(item.id, "visibility", e.target.value)} className="mt-2 w-full border border-white/10 bg-black px-3 py-3 text-sm text-white outline-none"><option value="PUBLIC">Public</option><option value="INTERNAL">Interne</option><option value="CLIENT_SPECIFIC">Client spécifique</option></select></label>
              <label className="flex items-end gap-3 text-sm text-white/60"><input type="checkbox" checked={item.active} onChange={(e) => update(item.id, "active", e.target.checked)} /> Prestation active</label>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-7 flex flex-wrap gap-3">
        <button onClick={() => setItems([...items, emptyItem()])} className="border border-white/15 px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-white/65">+ Ajouter une prestation</button>
        <button onClick={save} disabled={saving} className="bg-[#c7a15a] px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-black disabled:opacity-40">{saving ? "Enregistrement…" : "Enregistrer les changements"}</button>
      </div>
    </section>
  );
}
