"use client";

import { useRouter } from "next/navigation";

export default function BackButton({ fallback = "/espace/owner" }: { fallback?: string }) {
  const router = useRouter();

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push(fallback);
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className="mb-6 inline-flex items-center gap-2 border border-white/15 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-white/65 transition hover:border-[#F97316] hover:text-[#F97316]"
      aria-label="Retour à l’interface précédente"
    >
      <span aria-hidden="true">←</span>
      Retour
    </button>
  );
}
