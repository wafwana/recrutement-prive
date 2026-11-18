"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Profile = { title: string; kind: string };
type Profession = { code: string; name: string; profiles: Profile[] };
type Sector = { code: string; name: string; professions: Profession[] };
type Selection = { id: string; sectorCode: string; sectorName: string; professionCode: string; professionName: string; profileTitle?: string };

type Props = { sectors: Sector[] };

export default function ManualSourcingSelection({ sectors }: Props) {
  const [selected, setSelected] = useState<Record<string, Selection>>({});
  const [country, setCountry] = useState("");
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [completed, setCompleted] = useState<Array<{ title: string; id: string; status: string; kind: "candidate" | "offer" }>>([]);

  const selectedItems = useMemo(() => Object.values(selected), [selected]);
  function toggle(item: Selection, checked: boolean) {
    setSelected((current) => {
      const next = { ...current };
      if (checked) next[item.id] = item;
      else delete next[item.id];
      return next;
    });
  }

  async function launchOffers() {
    if (!selectedItems.length || running) return;
    setRunning(true);
    setMessage("");
    setCompleted([]);
    try {
      const response = await fetch("/api/sourcing/manual-offers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          criteria: selectedItems.map(({ sectorCode, professionCode, professionName, profileTitle }) => ({
            sectorCode, professionCode, professionName, profileTitle,
          })),
          country: country.trim() || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.search?.id) throw new Error(data.error || "Recherche d'offres refusée");
      setCompleted([{ title: "Recherche d'offres", id: data.search.id, status: data.search.status, kind: "offer" }]);
      setMessage(`Recherche d'offres enregistrée : ${data.search.fetched ?? 0} offre(s) collectée(s), ${data.search.failures ?? 0} source(s) en échec.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "La recherche d'offres a échoué.");
    } finally {
      setRunning(false);
    }
  }

  async function launchCandidates() {
    if (!selectedItems.length || running) return;
    setRunning(true);
    setMessage("");
    setCompleted([]);
    const done: Array<{ title: string; id: string; status: string }> = [];
    let failures = 0;
    try {
      for (const item of selectedItems) {
        try {
          const response = await fetch("/api/sourcing/proactive-search", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              sectorCode: item.sectorCode,
              professionCode: item.professionCode,
              query: item.profileTitle || item.professionName,
              country: country.trim() || undefined,
              skills: item.profileTitle ? [item.profileTitle, item.professionName] : [item.professionName],
            }),
          });
          const data = await response.json();
          if (!response.ok || !data.search?.id) throw new Error(data.error || "Recherche refusée");
          done.push({ title: item.profileTitle || item.professionName, id: data.search.id, status: data.search.status, kind: "candidate" });
          setCompleted([...done]);
        } catch {
          failures += 1;
        }
      }
      setMessage(`${done.length} recherche(s) enregistrée(s), ${failures} échec(s). Chaque recherche dispose de son propre historique.`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="mt-7 border border-[#F97316]/30 bg-[#101010] p-5 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#F97316]">Sourcing manuel ciblé</p>
          <h2 className="mt-2 font-serif text-2xl text-white">Composer une recherche multi-profils</h2>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-white/45">Cochez plusieurs métiers et profils forts, même dans des secteurs différents. Chaque critère déclenche une recherche distincte et conserve son historique existant.</p>
        </div>
        <label className="block w-full md:max-w-xs">
          <span className="text-[9px] uppercase tracking-[0.14em] text-white/40">Pays / zone (facultatif)</span>
          <input value={country} onChange={(event) => setCountry(event.target.value)} maxLength={100} placeholder="France, Belgique, Dubaï…" className="mt-2 h-10 w-full border border-white/15 bg-black px-3 text-xs text-white outline-none focus:border-[#F97316]/70" />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-y border-white/10 py-3">
        <p className="text-xs text-white/60">{selectedItems.length} critère(s) sélectionné(s)</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setSelected({})} disabled={!selectedItems.length || running} className="border border-white/15 px-3 py-2 text-[9px] uppercase tracking-[0.12em] text-white/55 disabled:opacity-40">Tout décocher</button>
          <button type="button" onClick={launchCandidates} disabled={!selectedItems.length || running} className="border border-[#F97316] bg-[#F97316]/10 px-4 py-2 text-[9px] uppercase tracking-[0.12em] text-[#F97316] disabled:opacity-40">{running ? "Recherches en cours…" : "Recherche candidat"}</button>
          <button type="button" onClick={launchOffers} disabled={!selectedItems.length || running} className="border border-white/25 px-4 py-2 text-[9px] uppercase tracking-[0.12em] text-white/75 disabled:opacity-40">{running ? "Collecte en cours…" : "Recherche offre"}</button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {sectors.map((sector) => (
          <details key={sector.code} className="border border-white/10 bg-black/30 p-3">
            <summary className="cursor-pointer text-xs text-white/80">{sector.name} <span className="ml-2 text-[10px] text-white/30">{sector.professions.length} métiers</span></summary>
            <div className="mt-3 space-y-3">
              {sector.professions.map((profession) => {
                const professionId = `${sector.code}:${profession.code}:profession`;
                return (
                  <div key={profession.code} className="border-t border-white/10 pt-3">
                    <label className="flex cursor-pointer items-start gap-2 text-xs text-white/80">
                      <input type="checkbox" checked={Boolean(selected[professionId])} onChange={(event) => toggle({ id: professionId, sectorCode: sector.code, sectorName: sector.name, professionCode: profession.code, professionName: profession.name }, event.target.checked)} className="mt-0.5 accent-orange-500" />
                      <span>{profession.name} <span className="text-[9px] text-white/30">· métier complet</span></span>
                    </label>
                    <div className="ml-6 mt-2 grid gap-2 sm:grid-cols-2">
                      {profession.profiles.map((profile) => {
                        const id = `${sector.code}:${profession.code}:profile:${profile.title}`;
                        return (
                          <label key={profile.title} className="flex cursor-pointer items-start gap-2 text-[10px] leading-4 text-white/55">
                            <input type="checkbox" checked={Boolean(selected[id])} onChange={(event) => toggle({ id, sectorCode: sector.code, sectorName: sector.name, professionCode: profession.code, professionName: profession.name, profileTitle: profile.title }, event.target.checked)} className="mt-0.5 accent-orange-500" />
                            <span>{profile.title}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        ))}
      </div>

      {message && <p role="status" className="mt-4 border border-white/10 bg-white/[0.03] p-3 text-xs text-white/75">{message}</p>}
      {completed.length > 0 && <div className="mt-3 space-y-2">{completed.map((item) => <p key={item.id} className="text-xs text-white/55"><Link className="text-[#F97316] underline" href={item.kind === "offer" ? `/espace/owner/sourcing-manuel?id=${item.id}` : `/espace/owner/recherche-proactive?id=${item.id}`}>{item.title}</Link> · {item.status}</p>)}</div>}
      <p className="mt-4 text-[10px] leading-5 text-white/30">La recherche d’offres utilise les flux HTTPS configurés, filtre les annonces selon les critères sélectionnés et conserve un dossier permanent distinct. Aucun candidat ni employeur n’est contacté automatiquement.</p>
    </section>
  );
}
