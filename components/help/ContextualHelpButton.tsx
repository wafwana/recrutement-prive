"use client";

import Link from "next/link";

type Props = {
  module: "SOURCING" | "MATCHING" | "CV_LIBRARY" | "PARTNERS" | "BILLING" | "JOBS" | "ADMIN" | "METIERS" | "GENERAL";
  categoryCode?: string;
  label?: string;
  className?: string;
};

export default function ContextualHelpButton({
  module,
  categoryCode,
  label = "Aide sur cette page",
  className = "inline-flex items-center gap-1.5 border border-[#c7a15a]/40 bg-[#c7a15a]/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[#c7a15a] hover:bg-[#c7a15a]/20 transition",
}: Props) {
  const queryParams = new URLSearchParams();
  if (module) queryParams.set("module", module);
  if (categoryCode) queryParams.set("category", categoryCode);

  const href = `/espace/help?${queryParams.toString()}`;

  return (
    <Link href={href} className={className} title="Consulter la documentation et les guides de procédure">
      <span className="text-[12px]">?</span>
      <span>{label}</span>
    </Link>
  );
}
