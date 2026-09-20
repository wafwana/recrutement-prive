import Link from "next/link";

const tabs = [
  ["/espace/owner", "Tableau de bord"],
  ["/espace/owner/archivage", "Archives / fichiers"],
  ["/espace/owner/pre-comptabilite", "Pré-comptabilité"],
  ["/espace/owner/admins", "Gouvernance"],
  ["/espace/owner/prestations-tarifs", "Prestations & tarifs"],
] as const;

export function OwnerNavigation() {
  return (
    <nav aria-label="Navigation Owner" className="mb-8 flex flex-wrap gap-2 border-b border-white/10 pb-4">
      {tabs.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          className="border border-white/10 bg-[#111] px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-white/60 transition hover:border-[#c7a15a] hover:text-[#c7a15a]"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
