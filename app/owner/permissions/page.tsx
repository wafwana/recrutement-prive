"use client";

import { useEffect, useState } from "react";

type Staff = {
  id: string; name: string | null; email: string; role: "ADMIN" | "CONSULTANT";
  status: string; permissions: string[] | null; configured: boolean;
};

const labels: Record<string, string> = {
  CANDIDATES_VIEW: "Voir les candidats / le vivier",
  CANDIDATES_MANAGE: "Gérer les candidats",
  CV_IMPORT: "Importer et traiter les CV",
  SOURCING: "Sourcing",
  MATCHING: "Matching",
  JOBS_MANAGE: "Gérer les offres / missions",
  PRESENTATIONS_MANAGE: "Présentations candidats",
  COMPANIES_MANAGE: "Gérer les entreprises",
  CRM: "CRM",
  REPORTING: "Reporting",
  DOCUMENTS_DEPOSIT: "Déposer un document",
  DOCUMENTS_VIEW: "Consulter les documents (hors sensibles)",
  MESSAGING_CLIENTS_ENTERPRISE: "Messagerie clients / entreprises",
  PLATFORM_SETTINGS: "Configuration plateforme",
};

export default function OwnerPermissionsPage() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/owner/permissions", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error || "Accès refusé."); return; }
    setPermissions(data.permissions || []);
    setStaff(data.users || []);
  }

  useEffect(() => { void load(); }, []);

  function toggle(userId: string, permission: string) {
    setStaff((current) => current.map((u) => {
      if (u.id !== userId) return u;
      const currentPermissions = u.permissions || [];
      const next = currentPermissions.includes(permission)
        ? currentPermissions.filter((p) => p !== permission)
        : [...currentPermissions, permission];
      return { ...u, permissions: next, configured: true };
    }));
  }

  async function save(user: Staff) {
    setSaving(user.id); setError(null); setSuccess(null);
    const res = await fetch("/api/owner/permissions", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, permissions: user.permissions || [] }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(null);
    if (!res.ok) { setError(data.error || "Enregistrement impossible."); return; }
    await load();
    setSuccess(`Permissions de ${user.name || user.email} enregistrées et vérifiées. La modification est journalisée.`);
  }

  return (
    <main className="min-h-screen bg-[#081625] px-6 py-10 text-[#F8FAFC]">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs uppercase tracking-[0.2em] text-[#F97316]">OWNER · Gouvernance</p>
        <h1 className="mt-2 text-3xl font-semibold">Permissions ADMIN / CONSULTANT</h1>
        <p className="mt-3 max-w-3xl text-sm text-white/70">
          L’OWNER décide individuellement de ce que chaque collaborateur peut utiliser.
          Les collaborateurs ne voient jamais cette matrice.
        </p>
        {error && <p className="mt-5 rounded border border-red-400/40 bg-red-400/10 p-3 text-sm">{error}</p>}
        {success && <p aria-live="polite" className="mt-5 rounded border border-emerald-400/40 bg-emerald-400/10 p-3 text-sm text-emerald-300">{success}</p>}
        <div className="mt-8 space-y-6">
          {staff.map((user) => (
            <section key={user.id} className="rounded border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-medium">{user.name || "Sans nom"} · {user.role}</h2>
                  <p className="text-xs text-white/50">{user.email} · {user.status}</p>
                </div>
                <button onClick={() => void save(user)} disabled={saving === user.id}
                  className="rounded border border-[#F97316] px-4 py-2 text-xs uppercase tracking-wider text-[#F97316]">
                  {saving === user.id ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {permissions.map((permission) => {
                  const checked = (user.permissions || []).includes(permission);
                  return (
                    <label key={permission} className="flex cursor-pointer items-center gap-3 rounded border border-white/10 p-3 text-sm">
                      <input type="checkbox" checked={checked} onChange={() => toggle(user.id, permission)} />
                      <span>{labels[permission] || permission}</span>
                    </label>
                  );
                })}
              </div>
            </section>
          ))}
          {!staff.length && <p className="text-sm text-white/60">Aucun ADMIN ou CONSULTANT à configurer.</p>}
        </div>
      </div>
    </main>
  );
}
