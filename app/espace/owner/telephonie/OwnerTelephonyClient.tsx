"use client";

import React, { useState } from "react";
import type { TelephonySettings } from "@/lib/telephony/types";

interface StaffPermission {
  id: string;
  name: string | null;
  email: string;
  role: string;
  canMakeOutboundCalls: boolean;
  grantedAt: string | null;
}

interface CallLogItem {
  id: string;
  direction: string;
  callerNumber: string;
  callerName: string | null;
  callerType: string | null;
  ivrChoice: string | null;
  destinationPhone: string | null;
  status: string;
  durationSeconds: number;
  linkedEntityId: string | null;
  linkedEntityType: string | null;
  notes: string | null;
  treatmentState: string;
  createdAt: string;
  initiatorUser?: { id: string; name: string | null; email: string; role: string } | null;
  voicemail?: {
    id: string;
    audioUrl: string | null;
    durationSeconds: number;
    transcription: string | null;
    status: string;
  } | null;
}

interface Props {
  initialSettings: TelephonySettings;
  initialStaffPermissions: StaffPermission[];
  initialCallLogs: CallLogItem[];
}

export default function OwnerTelephonyClient({
  initialSettings,
  initialStaffPermissions,
  initialCallLogs,
}: Props) {
  const [settings, setSettings] = useState<TelephonySettings>(initialSettings);
  const [staff, setStaff] = useState<StaffPermission[]>(initialStaffPermissions);
  const [callLogs, setCallLogs] = useState<CallLogItem[]>(initialCallLogs);

  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);

  const [outboundTargetPhone, setOutboundTargetPhone] = useState("");
  const [callingState, setCallingState] = useState<string | null>(null);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsMsg(null);

    try {
      const res = await fetch("/api/owner/telephony", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (!res.ok) {
        setSettingsMsg(`Erreur : ${data.error || "Mise à jour échouée."}`);
      } else {
        setSettingsMsg("Configuration enregistrée avec succès.");
      }
    } catch {
      setSettingsMsg("Erreur réseau lors de la sauvegarde.");
    } finally {
      setSavingSettings(false);
    }
  }

  async function toggleOutboundPermission(targetUserId: string, current: boolean) {
    const nextVal = !current;
    try {
      const res = await fetch("/api/owner/telephony", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId,
          canMakeOutboundCalls: nextVal,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setStaff((prev) =>
          prev.map((s) => (s.id === targetUserId ? { ...s, canMakeOutboundCalls: nextVal } : s))
        );
      } else {
        alert(data.error || "Impossible de modifier la permission.");
      }
    } catch {
      alert("Erreur réseau lors de la mise à jour des permissions.");
    }
  }

  async function handleInitiateOutboundCall(e: React.FormEvent) {
    e.preventDefault();
    if (!outboundTargetPhone) return;

    setCallingState("Lancement de l'appel...");
    try {
      const res = await fetch("/api/telephony/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPhoneNumber: outboundTargetPhone }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCallingState(`Refusé : ${data.error}`);
      } else {
        setCallingState(`Appel initialisé vers ${outboundTargetPhone} (Réf: ${data.callLogId})`);
        setOutboundTargetPhone("");
        // Refresh logs
        const refRes = await fetch("/api/owner/telephony");
        const refData = await refRes.json();
        if (refData.callLogs) setCallLogs(refData.callLogs);
      }
    } catch {
      setCallingState("Erreur lors de l'appel sortant.");
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mb-8 border-b border-white/10 pb-4">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c7a15a]">
          Espace Owner · Governance Téléphonique
        </span>
        <h1 className="mt-1 text-2xl font-serif font-bold text-white">
          Téléphonie Professionnelle Centralisée RP
        </h1>
        <p className="mt-1 text-xs text-white/60">
          Gestion du standard centralisé, routage par catégorie, numéros relais et contrôle d'accès aux appels sortants.
        </p>
      </div>

      {/* Grid configuration & Outbound call launcher */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Settings form */}
        <div className="lg:col-span-2 border border-white/10 bg-[#111111] p-6 rounded-none">
          <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-[#c7a15a] mb-4">
            Configuration du Standard RP
          </h2>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[10px] uppercase text-white/50 mb-1">
                  Numéro RP Centralisé (Présentation)
                </label>
                <input
                  type="text"
                  value={settings.centralPhoneNumber}
                  onChange={(e) => setSettings({ ...settings, centralPhoneNumber: e.target.value })}
                  className="w-full border border-white/10 bg-transparent px-3 py-2 text-white outline-none focus:border-[#c7a15a]"
                  placeholder="+33 1 89 00 00 00"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-white/50 mb-1">
                  Téléphone 1 · Owner (Sonne en premier)
                </label>
                <input
                  type="text"
                  value={settings.ownerPhone}
                  onChange={(e) => setSettings({ ...settings, ownerPhone: e.target.value })}
                  className="w-full border border-white/10 bg-transparent px-3 py-2 text-white outline-none focus:border-[#c7a15a]"
                  placeholder="+33 6 00 00 00 00"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-white/50 mb-1">
                  Téléphone 2 · Relais (Sonne en second)
                </label>
                <input
                  type="text"
                  value={settings.secondaryPhone || ""}
                  onChange={(e) => setSettings({ ...settings, secondaryPhone: e.target.value || null })}
                  className="w-full border border-white/10 bg-transparent px-3 py-2 text-white outline-none focus:border-[#c7a15a]"
                  placeholder="+33 6 11 22 33 44"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-white/50 mb-1">
                  Mode de Sonnerie Transfert
                </label>
                <select
                  value={settings.ringMode}
                  onChange={(e) =>
                    setSettings({ ...settings, ringMode: e.target.value as "SEQUENTIAL" | "SIMULTANEOUS" })
                  }
                  className="w-full border border-white/10 bg-[#1a1a1a] px-3 py-2 text-white outline-none focus:border-[#c7a15a]"
                >
                  <option value="SEQUENTIAL">Séquentiel (Owner d'abord puis Relais)</option>
                  <option value="SIMULTANEOUS">Simultané (Owner et Relais en même temps)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-white/50 mb-1">
                  Délai avant transfert / messagerie (sec)
                </label>
                <input
                  type="number"
                  value={settings.transferDelaySeconds}
                  onChange={(e) =>
                    setSettings({ ...settings, transferDelaySeconds: parseInt(e.target.value) || 15 })
                  }
                  className="w-full border border-white/10 bg-transparent px-3 py-2 text-white outline-none focus:border-[#c7a15a]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-white/50 mb-1">
                  Comportement Hors Horaires
                </label>
                <select
                  value={settings.offHoursBehavior}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      offHoursBehavior: e.target.value as "VOICEMAIL" | "REJECT" | "TRANSFER_OWNER",
                    })
                  }
                  className="w-full border border-white/10 bg-[#1a1a1a] px-3 py-2 text-white outline-none focus:border-[#c7a15a]"
                >
                  <option value="VOICEMAIL">Messagerie Vocale RP</option>
                  <option value="TRANSFER_OWNER">Transfert vers Owner</option>
                  <option value="REJECT">Refus d'appel</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase text-white/50 mb-1">
                Annonce d'accueil IVR (Menu vocal)
              </label>
              <textarea
                rows={3}
                value={settings.customIvrGreeting || ""}
                onChange={(e) => setSettings({ ...settings, customIvrGreeting: e.target.value })}
                className="w-full border border-white/10 bg-transparent px-3 py-2 text-white outline-none focus:border-[#c7a15a]"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="submit"
                disabled={savingSettings}
                className="border border-[#c7a15a] bg-[#c7a15a]/10 px-5 py-2.5 text-xs uppercase tracking-wider text-[#c7a15a] hover:bg-[#c7a15a] hover:text-black transition"
              >
                {savingSettings ? "Enregistrement..." : "Enregistrer la Configuration"}
              </button>
              {settingsMsg && <span className="text-xs text-white/80">{settingsMsg}</span>}
            </div>
          </form>
        </div>

        {/* Quick Outbound Launcher */}
        <div className="border border-white/10 bg-[#111111] p-6">
          <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-[#c7a15a] mb-2">
            Passer un Appel Sortant
          </h2>
          <p className="text-[11px] text-white/60 mb-4">
            Présente le numéro centralisé RP. Réservé à l'OWNER et aux collaborateurs dûment autorisés.
          </p>

          <form onSubmit={handleInitiateOutboundCall} className="space-y-4 text-xs">
            <div>
              <label className="block text-[10px] uppercase text-white/50 mb-1">
                Numéro du destinataire
              </label>
              <input
                type="tel"
                value={outboundTargetPhone}
                onChange={(e) => setOutboundTargetPhone(e.target.value)}
                placeholder="+33 6 12 34 56 78"
                className="w-full border border-white/10 bg-transparent px-3 py-2 text-white outline-none focus:border-[#c7a15a]"
              />
            </div>

            <button
              type="submit"
              className="w-full border border-emerald-500 bg-emerald-500/10 px-4 py-2.5 text-xs uppercase tracking-wider text-emerald-400 hover:bg-emerald-500 hover:text-black transition"
            >
              📞 Déclencher l'appel RP
            </button>

            {callingState && (
              <div className="border border-white/10 bg-black/40 p-3 text-[11px] text-white/80">
                {callingState}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Outbound Delegation Permissions Management */}
      <div className="mt-8 border border-white/10 bg-[#111111] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-[#c7a15a]">
              Autorisations d'Appels Sortants (Délégation OWNER)
            </h2>
            <p className="text-xs text-white/50 mt-1">
              Seul l'OWNER est autorisé par défaut. Accordez la permission de manière explicite et révocable.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white/80">
            <thead className="border-b border-white/10 text-[10px] uppercase tracking-wider text-white/40">
              <tr>
                <th className="py-2.5 px-3">Utilisateur / Collaborateur</th>
                <th className="py-2.5 px-3">Rôle</th>
                <th className="py-2.5 px-3">Statut Droit Sortant</th>
                <th className="py-2.5 px-3 text-right">Action Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {staff.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 px-3 text-white/40 italic">
                    Aucun compte ADMIN ou CONSULTANT configuré.
                  </td>
                </tr>
              ) : (
                staff.map((s) => (
                  <tr key={s.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3">
                      <div className="font-medium text-white">{s.name || "Sans nom"}</div>
                      <div className="text-[10px] text-white/40">{s.email}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="border border-white/10 px-2 py-0.5 text-[9px] tracking-widest uppercase">
                        {s.role}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {s.role === "OWNER" ? (
                        <span className="text-amber-400 font-semibold">● Autorisé permanent (OWNER)</span>
                      ) : s.canMakeOutboundCalls ? (
                        <span className="text-emerald-400 font-semibold">● Autorisé par Owner</span>
                      ) : (
                        <span className="text-rose-400 font-semibold">○ Bloqué (Défaut)</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {s.role === "OWNER" ? (
                        <span className="text-[10px] text-white/30 italic">Autorité Suprême</span>
                      ) : (
                        <button
                          onClick={() => toggleOutboundPermission(s.id, s.canMakeOutboundCalls)}
                          className={`border px-3 py-1 text-[10px] uppercase tracking-wider transition ${
                            s.canMakeOutboundCalls
                              ? "border-rose-500/40 text-rose-300 hover:bg-rose-500 hover:text-black"
                              : "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500 hover:text-black"
                          }`}
                        >
                          {s.canMakeOutboundCalls ? "Révoker l'accès" : "Autoriser appels"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Call logs & Voicemails */}
      <div className="mt-8 border border-white/10 bg-[#111111] p-6">
        <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-[#c7a15a] mb-4">
          Journal d'Appels & Messagerie Vocale
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white/80">
            <thead className="border-b border-white/10 text-[10px] uppercase tracking-wider text-white/40">
              <tr>
                <th className="py-2.5 px-3">Horodatage</th>
                <th className="py-2.5 px-3">Direction</th>
                <th className="py-2.5 px-3">Correspondant / Identité</th>
                <th className="py-2.5 px-3">Catégorie / Annonce</th>
                <th className="py-2.5 px-3">Statut</th>
                <th className="py-2.5 px-3">Message Vocal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {callLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 px-3 text-center text-white/40 italic">
                    Aucun historique d'appel enregistré pour le moment.
                  </td>
                </tr>
              ) : (
                callLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3 text-[11px] text-white/60">
                      {new Date(log.createdAt).toLocaleString("fr-FR")}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] uppercase font-bold tracking-wider ${
                          log.direction === "INBOUND" ? "text-cyan-400" : "text-amber-400"
                        }`}
                      >
                        {log.direction === "INBOUND" ? "↙ Entrant" : "↗ Sortant"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-white">
                        {log.callerName || log.callerNumber}
                      </div>
                      {log.callerName && (
                        <div className="text-[10px] text-white/40">{log.callerNumber}</div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="border border-white/10 px-2 py-0.5 text-[9px] uppercase tracking-wider text-white/70">
                        {log.callerType || "Non classé"}
                      </span>
                      {log.notes && <div className="text-[10px] text-white/40 mt-1">{log.notes}</div>}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[11px] font-medium text-white/80">{log.status}</span>
                    </td>
                    <td className="py-3 px-3">
                      {log.voicemail ? (
                        <div className="border border-amber-500/30 bg-amber-500/5 p-2 text-[10px]">
                          <span className="text-amber-300 font-bold">🎙 Message Vocal</span> (
                          {log.voicemail.durationSeconds}s)
                          {log.voicemail.transcription && (
                            <p className="text-white/70 mt-1 italic">
                              "{log.voicemail.transcription}"
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-white/30 text-[10px]">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
