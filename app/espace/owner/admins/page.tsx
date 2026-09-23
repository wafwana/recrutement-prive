"use client";

import BackButton from "@/components/navigation/BackButton";


import { FormEvent, useEffect, useState } from "react";

type StaffUser = { id: string; name: string | null; email: string; role: string; status: string; createdAt: string };

export default function OwnerAdminsPage() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/owner/admins?role=ADMIN", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Accès refusé.");
      setLoading(false);
      return;
    }
    setUsers(data.users || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/owner/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        role: form.get("role"),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Impossible de créer le compte.");
    } else {
      setUsers((current) => [...current, data.user]);
      setMessage(`Compte ${data.user.role} créé par l'Owner.`);
      event.currentTarget.reset();
    }
    setSaving(false);
  }

  async function handleAction(userId: string, action: "SUSPEND" | "REACTIVATE" | "REVOKE") {
    setMessage("");
    const reason = window.prompt(`Veuillez indiquer le motif obligatoire de cette action (${action}) :`);
    if (!reason || reason.trim().length < 5) {
      setMessage("Action annulée : un motif d'au moins 5 caractères est obligatoire.");
      return;
    }

    const response = await fetch("/api/owner/admins", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action, reason: reason.trim() }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Action impossible.");
    } else {
      setMessage(`Statut mis à jour pour ${data.user.email}.`);
      load();
    }
  }

  return (
    <section className="mx-auto w-[min(900px,calc(100%-40px))] py-12 md:w-[min(900px,calc(100%-72px))] md:py-20">
      <BackButton />
      <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Owner · Gouvernance</p>
      <h1 className="mt-4 font-serif text-4xl sm:text-5xl">Gouvernance ADMIN & CONSULTANT.</h1>
      <div className="mt-6 flex flex-wrap gap-3">
        <a href="/espace/owner/admins" className="border border-[#c7a15a] bg-[#c7a15a]/10 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#c7a15a]">Gérer les ADMIN</a>
        <a href="/espace/owner/consultants" className="border border-white/15 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-white/65">Gérer les CONSULTANTS</a>
        <a href="/owner/permissions" className="border border-[#F97316] bg-[#F97316]/10 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#F97316]">Gestion des permissions</a>
      </div>

      <p className="mt-5 max-w-3xl text-sm leading-7 text-white/50">
        Seul l&apos;Owner détient l&apos;autorité suprême. L&apos;Owner peut désigner, suspendre ou révoquer les administrateurs et consultants.
        Un Administrateur ne peut jamais se promouvoir Owner ni altérer l&apos;Owner.
      </p>

      {loading ? <p className="mt-10 text-sm text-white/40">Chargement…</p> : (
        <>
          <form onSubmit={handleSubmit} className="mt-10 space-y-5 border border-white/10 bg-[#111] p-7">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="text-xs text-white/45">Rôle
                <select name="role" required className="mt-2 w-full border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none">
                  <option value="ADMIN">ADMINISTRATEUR</option>
                  <option value="CONSULTANT">CONSULTANT</option>
                </select>
              </label>
              <label className="text-xs text-white/45">Nom
                <input name="name" required minLength={2} maxLength={120} className="mt-2 w-full border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none" />
              </label>
              <label className="text-xs text-white/45 md:col-span-2">Email
                <input name="email" type="email" required maxLength={320} className="mt-2 w-full border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none" />
              </label>
              <label className="text-xs text-white/45 md:col-span-2">Mot de passe
                <input name="password" type="password" required className="mt-2 w-full border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none" />
                <span className="mt-2 block text-[11px] text-white/30">Respecte les règles : 8+ chars, majuscule, minuscule, chiffre, symbole. Ex: Recrutement@1</span>
              </label>
            </div>
            <button disabled={saving} className="w-full border border-[#c7a15a]/50 px-5 py-4 text-[10px] uppercase tracking-[0.2em] text-[#c7a15a] disabled:opacity-40">
              {saving ? "Création…" : "Créer le compte"}
            </button>
          </form>

          {message && <p aria-live="polite" className="mt-5 border border-white/10 p-5 text-sm text-white/60">{message}</p>}

          <section className="mt-10 border border-white/10 p-7">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Équipe d&apos;administration et consultants</p>
            <div className="mt-6 space-y-3">
              {users.length === 0 && <p className="text-sm text-white/35">Aucun membre enregistré.</p>}
              {users.map((u) => (
                <div key={u.id} className="flex flex-col gap-4 border border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm text-white/80">{u.name || u.email}</p>
                      <span className="border border-[#c7a15a]/30 px-2 py-0.5 text-[9px] uppercase tracking-widest text-[#c7a15a]">{u.role}</span>
                      <span className={`px-2 py-0.5 text-[9px] uppercase tracking-widest ${u.status === "ACTIVE" ? "text-emerald-400" : "text-amber-400"}`}>{u.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-white/35">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.status === "ACTIVE" ? (
                      <button type="button" onClick={() => handleAction(u.id, "SUSPEND")} className="border border-amber-500/40 px-3 py-1.5 text-[10px] uppercase text-amber-300 hover:bg-amber-500/20">Suspendre</button>
                    ) : (
                      <button type="button" onClick={() => handleAction(u.id, "REACTIVATE")} className="border border-emerald-500/40 px-3 py-1.5 text-[10px] uppercase text-emerald-300 hover:bg-emerald-500/20">Réactiver</button>
                    )}
                    <button type="button" onClick={() => handleAction(u.id, "REVOKE")} className="border border-red-500/40 px-3 py-1.5 text-[10px] uppercase text-red-300 hover:bg-red-500/20">Révoquer</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </section>
  );
}
