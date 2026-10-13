"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ArchiveProactiveSearchButton({ searchId }: { searchId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function archive() {
    if (!window.confirm("Archiver cette recherche ? Son historique et ses résultats seront conservés.")) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/sourcing/proactive-search/${encodeURIComponent(searchId)}`, { method: "PATCH" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Archivage impossible.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'archivage.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" disabled={busy} onClick={archive} className="border border-white/15 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-white/50 disabled:opacity-50">
        {busy ? "Archivage…" : "Archiver"}
      </button>
      {error && <p className="mt-2 text-xs text-red-200">{error}</p>}
    </div>
  );
}
