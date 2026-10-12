"use client";

import { useEffect, useState } from "react";

type Company = { id: string; name: string; country: string | null; countries: string[]; updatedAt: string | null };

export default function EnterpriseSourcingCountriesClient() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [countriesText, setCountriesText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/owner/sourcing/countries", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible de charger les entreprises.");
      const rows = Array.isArray(data.companies) ? data.companies as Company[] : [];
      setCompanies(rows);
      const selectedId = companyId || rows[0]?.id || "";
      setCompanyId(selectedId);
      const selected = rows.find((item) => item.id === selectedId);
      setCountriesText((selected?.countries ?? []).join("\n"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function chooseCompany(id: string) {
    setCompanyId(id);
    setCountriesText((companies.find((item) => item.id === id)?.countries ?? []).join("\n"));
    setMessage("");
  }

  async function save() {
    if (!companyId) return;
    setSaving(true);
    setMessage("");
    try {
      const countries = [...new Set(countriesText.split(/[\n,;]/).map((value) => value.trim()).filter(Boolean))];
      const response = await fetch("/api/owner/sourcing/countries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, countries }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Enregistrement impossible.");
      setCompanies((current) => current.map((company) => company.id === companyId ? { ...company, countries: data.countries } : company));
      setCountriesText((data.countries as string[]).join("\n"));
      setMessage("Configuration enregistrée. Aucun sourcing n’a été lancé.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erreur d’enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="mt-8 text-sm text-white/50">Chargement de la configuration…</p>;

  return (
    <section className="mt-8 border border-white/10 bg-[#0b0f14] p-6">
      {companies.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-white">Aucune entreprise n’est encore enregistrée.</p>
          <p className="text-sm leading-6 text-white/50">Créez d’abord une entreprise depuis l’espace OWNER, puis revenez ici pour configurer ses pays de sourcing.</p>
          <a href="/espace/owner/entreprises/nouvelle" className="inline-block border border-[#c7a15a] px-4 py-3 text-xs text-[#c7a15a]">Ajouter une entreprise</a>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <label className="text-xs text-white/60">Entreprise
            <select value={companyId} onChange={(event) => chooseCompany(event.target.value)} className="mt-2 w-full border border-white/10 bg-[#111] px-4 py-3 text-sm text-white">
              {companies.map((company) => <option key={company.id} value={company.id}>{company.name}{company.country ? ` — ${company.country}` : ""}</option>)}
            </select>
          </label>
          <div className="text-xs leading-6 text-white/45">
            Une ligne par pays (ex. France, Inde, Émirats arabes unis). Maximum 50 pays par entreprise. Le cron ne traitera que les offres dont le pays correspond.
          </div>
          <label className="text-xs text-white/60 md:col-span-2">Pays ciblés
            <textarea value={countriesText} onChange={(event) => setCountriesText(event.target.value)} rows={6} maxLength={6000} placeholder={"France\nInde\nÉmirats arabes unis"} className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2">
            <p aria-live="polite" className="text-xs text-[#c7a15a]">{message}</p>
            <button type="button" disabled={saving || !companyId} onClick={() => void save()} className="border border-[#c7a15a] px-5 py-3 text-xs text-[#c7a15a] disabled:opacity-50">{saving ? "Enregistrement…" : "Enregistrer les pays"}</button>
          </div>
        </div>
      )}
    </section>
  );
}
