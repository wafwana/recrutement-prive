import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import BackButton from "@/components/navigation/BackButton";

export default async function OwnerSourcingPage() {
  const session = await auth();
  if (!session?.user?.id || !["OWNER", "ADMIN", "CONSULTANT"].includes(session.user.role || "")) redirect("/connexion");
  if (!(await hasPermission(session.user.id, session.user.role, "SOURCING"))) redirect("/espace/owner");

  const offers = await prisma.externalJobOpportunity.findMany({
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      title: true,
      companyName: true,
      country: true,
      city: true,
      source: true,
      sourceUrl: true,
      publishedAt: true,
      categoryCode: true,
      subCategoryCode: true,
      status: true,
      createdAt: true,
    },
  });

  return (
    <section className="mx-auto w-[min(1280px,calc(100%-40px))] py-12 md:w-[min(1280px,calc(100%-72px))] md:py-20">
      <BackButton />
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Owner · Sourcing automatique</p>
          <h1 className="mt-4 font-serif text-4xl sm:text-5xl">Offres détectées automatiquement.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/50">
            Les offres externes sont conservées dans le vivier de sourcing pour qualification et matching. Elles ne sont pas exposées publiquement.
          </p>
        </div>
        <div className="border border-[#c7a15a]/30 px-5 py-4 text-right">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Offres détectées</p>
          <p className="mt-2 font-serif text-3xl text-[#c7a15a]">{offers.length}</p>
        </div>
      </div>

      <div className="mt-10 overflow-hidden border border-white/10">
        <div className="grid grid-cols-1 border-b border-white/10 bg-[#111] px-5 py-4 text-[10px] uppercase tracking-[0.16em] text-white/35 md:grid-cols-[2fr_1.1fr_1fr_1fr_1fr]">
          <span>Offre</span><span>Entreprise</span><span>Localisation</span><span>Catégorie</span><span>Source</span>
        </div>
        <div>
          {offers.map((offer) => (
            <article key={offer.id} className="grid grid-cols-1 gap-3 border-b border-white/10 px-5 py-5 last:border-b-0 md:grid-cols-[2fr_1.1fr_1fr_1fr_1fr] md:items-center">
              <div>
                <p className="text-sm text-white/85">{offer.title}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/30">{offer.status}</p>
              </div>
              <p className="text-xs text-white/55">{offer.companyName || "Entreprise non renseignée"}</p>
              <p className="text-xs text-white/55">{[offer.city, offer.country].filter(Boolean).join(", ") || "—"}</p>
              <p className="text-xs text-white/55">{offer.categoryCode || "À qualifier"}{offer.subCategoryCode ? ` · ${offer.subCategoryCode}` : ""}</p>
              <div className="text-xs">
                {offer.sourceUrl ? (
                  <a href={offer.sourceUrl} target="_blank" rel="noreferrer" className="text-[#F97316] hover:underline">
                    Voir la source
                  </a>
                ) : (
                  <span className="text-white/30">{offer.source}</span>
                )}
                {offer.publishedAt && <p className="mt-1 text-[10px] text-white/25">{offer.publishedAt.toLocaleDateString("fr-FR")}</p>}
              </div>
            </article>
          ))}
          {offers.length === 0 && (
            <div className="px-5 py-12 text-center text-sm text-white/35">
              Aucune offre détectée pour le moment. Le prochain passage automatique alimentera cette liste.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
