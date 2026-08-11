"use client";

import { useEffect, useState } from "react";

type Settings = {
  maintenanceMode: boolean;
  allowCandidateRegistration: boolean;
  allowCompanyRegistration: boolean;
  notificationsEnabled: boolean;
  defaultApplicationStatus: "SUBMITTED" | "REVIEWING" | "INTERVIEW" | "SHORTLISTED" | "REJECTED" | "HIRED";
};
type BooleanSetting = Exclude<keyof Settings, "defaultApplicationStatus">;

const defaults: Settings = {
  maintenanceMode: false,
  allowCandidateRegistration: true,
  allowCompanyRegistration: true,
  notificationsEnabled: true,
  defaultApplicationStatus: "SUBMITTED",
};

const toggles: { key: BooleanSetting; title: string; description: string }[] = [
  { key: "maintenanceMode", title: "Mode maintenance", description: "Suspendre les nouveaux parcours lors d'une opération technique." },
  { key: "allowCandidateRegistration", title: "Inscription candidat", description: "Autoriser la création de nouveaux comptes candidats." },
  { key: "allowCompanyRegistration", title: "Inscription entreprise", description: "Autoriser la création de nouveaux comptes entreprise." },
  { key: "notificationsEnabled", title: "Notifications", description: "Activer les notifications applicatives futures." },
];

export default function AdminConfigurationPage() {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [status, setStatus] = useState("Chargement…");

  useEffect(() => {
    fetch("/api/admin/settings", { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (response.ok) setSettings(data.settings);
      setStatus(response.ok ? "Configuration chargée" : data.error || "Accès refusé");
    });
  }, []);

  const save = async () => {
    setStatus("Enregistrement…");
    const response = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
    const data = await response.json();
    setStatus(response.ok ? "Configuration enregistrée" : data.error || "Erreur d'enregistrement");
  };

  const toggle = (key: BooleanSetting) => setSettings((current) => ({ ...current, [key]: !current[key] }));

  return (
    <section className="mx-auto w-[min(1000px,calc(100%-40px))] py-14 md:w-[min(1000px,calc(100%-72px))] md:py-20">
      <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Administration</p>
      <h1 className="mt-4 font-serif text-5xl">Configuration.</h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-white/50">Les paramètres sont persistés en base et protégés par le rôle ADMIN.</p>
      <div className="mt-10 space-y-3">
        {toggles.map(({ key, title, description }) => (
          <button key={key} type="button" onClick={() => toggle(key)} className="flex w-full items-center justify-between gap-6 border border-white/10 bg-[#111] p-6 text-left transition hover:border-white/20">
            <span><strong className="block font-serif text-xl font-normal">{title}</strong><span className="mt-2 block text-xs leading-5 text-white/40">{description}</span></span>
            <span className={`h-6 w-11 rounded-full border p-1 ${settings[key] ? "border-[#c7a15a]" : "border-white/20"}`}><span className={`block h-4 w-4 rounded-full transition ${settings[key] ? "translate-x-5 bg-[#c7a15a]" : "bg-white/30"}`} /></span>
          </button>
        ))}
      </div>
      <label className="mt-6 block border border-white/10 bg-[#111] p-6"><span className="text-[10px] uppercase tracking-[0.2em] text-white/35">Statut initial d'une candidature</span><select value={settings.defaultApplicationStatus} onChange={(event) => setSettings({ ...settings, defaultApplicationStatus: event.target.value as Settings["defaultApplicationStatus"] })} className="mt-3 w-full border border-white/10 bg-[#0b0b0b] px-4 py-3 text-sm text-white"><option value="SUBMITTED">Soumise</option><option value="REVIEWING">En étude</option><option value="INTERVIEW">Entretien</option><option value="SHORTLISTED">Présélection</option><option value="REJECTED">Refusée</option><option value="HIRED">Recrutée</option></select></label>
      <div className="mt-8 flex items-center justify-between gap-4"><span className="text-xs text-white/35">{status}</span><button type="button" onClick={() => void save()} className="border border-[#c7a15a]/60 px-6 py-3 text-[10px] uppercase tracking-[0.18em] text-[#c7a15a] hover:bg-[#c7a15a] hover:text-black">Enregistrer</button></div>
    </section>
  );
}
