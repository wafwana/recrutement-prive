import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { compareOfferPriority, getFinancialStatus, parseSalary } from "@/lib/offers/salary";
import BackButton from "@/components/navigation/BackButton";
import { processOwnerRawOffer } from "@/app/espace/owner/offres/nouvelle/raw-actions";

const statusLabels: Record<string, string> = {
  DETECTED: "Nouvelle",
  A_QUALIFIER: "À qualifier",
  QUALIFIED: "Qualifiée",
  MATCHING: "En matching",
  CONTACTED: "Contactée",
  FILLED: "Pourvue",
  ARCHIVED: "Archivée",
  REJECTED: "Écartée",
};

export default async function OfferPoolPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; country?: string }>;
}) {
  const session = await auth();
  const id = session?.user?.id;
  const role = session?.user?.role;
  if (!id || !["OWNER", "ADMIN", "CONSULTANT"].includes(role || "")) redirect("/connexion");
  if (!(await hasPermission(id, role, "OFFRES_VIVIER"))) redirect("/espace/owner");

  const params = await searchParams;
  const q = params.q?.trim().toLowerCase() || "";
  const statusFilter = params.status?.trim() || "";
  const countryFilter = params.country?.trim().toLowerCase() || "";

  const [offers, total, toQualify, qualified, matching] = await Promise.all([
    prisma.externalJobOpportunity.findMany({
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 5000,
      select: {
        id: true, title: true, companyName: true, country: true, city: true,
        categoryCode: true, subCategoryCode: true, source: true, sourceUrl: true,
        publishedAt: true, salary: true, status: true, rawData: true,
      },
    }),
    prisma.externalJobOpportunity.count(),
    prisma.externalJobOpportunity.count({ where: { status: "A_QUALIFIER" } }),
    prisma.externalJobOpportunity.count({ where: { status: "QUALIFIED" } }),
    prisma.externalJobOpportunity.count({ where: { status: "MATCHING" } }),
  ]);

  const filtered = offers.filter((offer) => {
    if (statusFilter && offer.status !== statusFilter) return false;
    if (countryFilter && !(offer.country || "").toLowerCase().includes(countryFilter)) return false;
    if (!q) return true;
    return [offer.title, offer.companyName, offer.country, offer.city, offer.categoryCode, offer.subCategoryCode]
      .some((value) => String(value || "").toLowerCase().includes(q));
  });

  filtered.sort((a, b) => {
    const salaryOrder = compareOfferPriority(a, b);
    if (salaryOrder !== 0) return salaryOrder;
    return 0;
  });

  const countries = [...new Set(offers.map((offer) => offer.country).filter(Boolean) as string[])].sort();

  return (
    <section className="mx-auto w-[min(1400px,calc(100%-40px))] py-12 md:py-20">
      <BackButton />
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Owner · Vivier des offres</p>
          <h1 className="mt-4 font-serif text-4xl sm:text-5xl">Vivier des offres.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/50">
            Vivier strictement interne : offres issues du sourcing automatique ou ajoutées manuellement,
            conservées pour qualification et matching. Aucune offre détaillée n’est exposée publiquement.
          </p>
        </div>
        <Link href="/espace/owner/sourcing" className="border border-[#F97316] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#F97316]">
          Lancer / voir le sourcing
        </Link>
      </div>

      <div className="mt-8 grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Offres conservées", total],
          ["À qualifier", toQualify],
          ["Qualifiées", qualified],
          ["En matching", matching],
        ].map(([label, value]) => (
          <div key={String(label)} className="bg-[#111] p-5">
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">{label}</p>
            <p className="mt-2 font-serif text-3xl text-[#c7a15a]">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 border border-[#F97316]/30 bg-[#F97316]/5 p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-[#F97316]">Priorité automatique</p>
        <p className="mt-2 text-sm text-white/75">
          Les rémunérations lisibles sont annualisées lorsque la fréquence est connue puis classées du montant le plus élevé au plus faible.
          Une offre sans salaire n'est pas considérée comme faible : les signaux financiers explicitement fournis par la source sont contrôlés.
          Si aucun salaire n'est publié, elle reste en « rémunération à négocier » et aucun montant n'est inventé.
          Lorsque deux devises différentes sont détectées, elles ne sont pas comparées artificiellement sans taux de change fiable.
        </p>
      </div>

      <form method="get" className="mt-8 grid gap-3 border border-white/10 p-5 md:grid-cols-[2fr_1fr_1fr_auto]">
        <input name="q" defaultValue={params.q || ""} placeholder="Titre, entreprise, ville, métier…" className="border border-white/10 bg-transparent px-4 py-3 text-sm outline-none" />
        <select name="status" defaultValue={statusFilter} className="border border-white/10 bg-[#111] px-4 py-3 text-sm">
          <option value="">Tous les statuts</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select name="country" defaultValue={params.country || ""} className="border border-white/10 bg-[#111] px-4 py-3 text-sm">
          <option value="">Tous les pays</option>
          {countries.map((country) => <option key={country} value={country}>{country}</option>)}
        </select>
        <button className="border border-[#c7a15a] px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-[#c7a15a]">Rechercher</button>
      </form>

      <div className="mt-8 overflow-hidden border border-white/10">
        <div className="hidden border-b border-white/10 bg-[#111] px-5 py-4 text-[10px] uppercase tracking-[0.16em] text-white/35 md:grid md:grid-cols-[2fr_1.1fr_1fr_1fr_1fr]">
          <span>Offre / salaire</span><span>Entreprise</span><span>Localisation</span><span>Métier</span><span>État / source</span>
        </div>
        {filtered.map((offer) => {
          const salary = parseSalary(offer.salary);
          return (
            <article key={offer.id} className="grid grid-cols-1 gap-3 border-b border-white/10 px-5 py-5 last:border-b-0 md:grid-cols-[2fr_1.1fr_1fr_1fr_1fr] md:items-center">
              <div>
                <p className="text-sm text-white/85">{offer.title}</p>
                {offer.salary ? (
                  <p className="mt-1 text-sm font-medium text-[#F97316]">{offer.salary}</p>
                ) : (
                  <p className="mt-1 text-xs text-white/30">Salaire non communiqué</p>
                )}
                {salary.value !== null && <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-white/30">Priorité salaire · {Math.round(salary.value).toLocaleString("fr-FR")} / an{salary.currency ? ` · ${salary.currency}` : ""}</p>}
                {salary.value === null && (
                  <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-[#c7a15a]">
                    Rémunération à négocier · signal financier source : {{
                      SOURCE_POSITIVE: "signal positif",
                      SOURCE_WATCH: "à surveiller",
                      SOURCE_DIFFICULTY: "difficulté signalée",
                      UNKNOWN: "à vérifier",
                    }[getFinancialStatus(offer.rawData)]}
                  </p>
                )}
              </div>
              <p className="text-xs text-white/55">{offer.companyName || "Entreprise non renseignée"}</p>
              <p className="text-xs text-white/55">{[offer.city, offer.country].filter(Boolean).join(", ") || "—"}</p>
              <p className="text-xs text-white/55">{offer.categoryCode || "À qualifier"}{offer.subCategoryCode ? " · " + offer.subCategoryCode : ""}</p>
              <div>
                <p className="text-xs text-[#c7a15a]">{statusLabels[offer.status] || offer.status}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/30">{offer.source}</p>
                {offer.sourceUrl && <a href={offer.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[10px] text-[#F97316] hover:underline">Source</a>}
                <form action={processOwnerRawOffer} className="mt-2"><input type="hidden" name="externalJobId" value={offer.id}/><button className="border border-[#c7a15a]/70 px-3 py-2 text-[9px] uppercase tracking-[0.12em] text-[#c7a15a]">Rentrer une offre</button></form>
              </div>
            </article>
          );
        })}
        {!filtered.length && <div className="px-5 py-12 text-center text-sm text-white/35">Aucune offre ne correspond aux critères.</div>}
      </div>
    </section>
  );
}
