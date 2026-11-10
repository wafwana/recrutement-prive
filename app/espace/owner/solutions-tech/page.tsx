import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";

export default async function OwnerSolutionsTechPage() {
  const session = await auth();
  const role = session?.user?.role;
  const userId = session?.user?.id;

  if (!userId || !role) redirect("/connexion");

  const isOwner = role === "OWNER";
  const canAccess = isOwner || (await hasPermission(userId, role, "TECH_SOLUTIONS_MANAGE"));

  if (!canAccess) {
    redirect("/espace");
  }

  // 1. Requêtes réelles sur les modèles étanches du Pôle 2
  const [
    totalProspects,
    prospectsToQualify,
    requirementsReceived,
    requirementsAnalyzing,
    proposalsCount,
    projectsSigned,
    projectsActive,
    activeSubscriptions,
    mrrByCurrency,
    prospectsList,
    projectsList,
  ] = await Promise.all([
    prisma.techProspect.count(),
    prisma.techProspect.count({ where: { status: "A_QUALIFIER" } }),
    prisma.techRequirementDoc.count(),
    prisma.techRequirementDoc.count({ where: { status: "ANALYSE_EN_COURS" } }),
    prisma.techProspect.count({ where: { status: "PROPOSITION" } }),
    prisma.techProject.count({ where: { techProspect: { status: "SIGNE" } } }),
    prisma.techProject.count({ where: { status: { in: ["DEVELOPPEMENT", "RECETTE"] } } }),
    prisma.techProject.count({ where: { status: "MAINTENANCE" } }),
    prisma.techProject.groupBy({
      by: ["currency"],
      where: { status: "MAINTENANCE" },
      _sum: { monthlySubscriptionPrice: true },
    }),
    prisma.techProspect.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        companyName: true,
        sector: true,
        country: true,
        status: true,
        priority: true,
        createdAt: true,
      },
    }),
    prisma.techProject.findMany({
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true,
        name: true,
        status: true,
        monthlySubscriptionPrice: true,
        currency: true,
        updatedAt: true,
        techProspect: { select: { companyName: true } },
      },
    }),
  ]);

  // MRR calculé sur tous les projets en maintenance, sans dépendre de la liste récente
  // limitée à 6 éléments. Les devises restent séparées pour éviter un total incohérent.
  const mrrTotal = mrrByCurrency
    .map(({ currency, _sum }) => `${(_sum.monthlySubscriptionPrice ?? 0).toLocaleString("fr-FR")} ${currency}`)
    .join(" · ") || "0 EUR";

  const metrics = [
    { label: "Prospects technologiques", value: totalProspects, desc: "Entreprises identifiées" },
    { label: "Entreprises à qualifier", value: prospectsToQualify, desc: "Signaux & besoins à valider" },
    { label: "Cahiers des charges reçus", value: requirementsReceived, desc: "Dossiers clients déposés" },
    { label: "Analyses en cours", value: requirementsAnalyzing, desc: "Faisabilité & briques RP" },
    { label: "Propositions commerciales", value: proposalsCount, desc: "Devis & scénarios émis" },
    { label: "Projets signés", value: projectsSigned, desc: "Projets liés à un prospect au statut SIGNE" },
    { label: "Projets en cours", value: projectsActive, desc: "Développement & recette" },
    { label: "Abonnements actifs", value: activeSubscriptions, desc: "Contrats récurrents" },
    { label: "Revenus récurrents (MRR)", value: mrrTotal, desc: "Mensualités des projets en maintenance, par devise" },
  ];

  return (
    <main className="min-h-screen bg-[#081625] px-6 py-10 text-[#F8FAFC]">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header & Nav */}
        <div className="flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="border border-[#c7a15a]/40 bg-[#c7a15a]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c7a15a]">
                Pôle 2 · Solutions Technologiques & Plateformes
              </span>
              <span className="text-[10px] uppercase tracking-wider text-white/40">Gouvernance OWNER</span>
            </div>
            <h1 className="mt-3 font-serif text-3xl font-semibold sm:text-4xl">
              Cockpit Solutions Technologiques Sur Mesure
            </h1>
            <p className="mt-2 max-w-3xl text-xs leading-relaxed text-white/60">
              Pilotage de l&apos;activité de création de sites, plateformes métier, CRM, espaces clients et applications web personnalisées. Données strictement étanches au Pôle 1 (Recrutement).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/espace/owner"
              className="border border-white/20 px-3.5 py-2 text-[10px] uppercase tracking-[0.16em] text-white/70 hover:border-white/40"
            >
              Cockpit Global
            </Link>
            <Link
              href="/espace/owner/solutions-tech/crm"
              className="border border-[#c7a15a]/60 bg-[#c7a15a]/10 px-3.5 py-2 text-[10px] uppercase tracking-[0.16em] text-[#c7a15a] hover:bg-[#c7a15a]/20"
            >
              Ouvrir le CRM Pôle 2
            </Link>
          </div>
        </div>

        {/* 9 Indicateurs Clés Pôle 2 */}
        <section aria-labelledby="metrics-heading" className="space-y-4">
          <h2 id="metrics-heading" className="text-xs uppercase tracking-[0.2em] text-white/40">
            Indicateurs de Pilotage Pôle 2
          </h2>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {metrics.map((m, idx) => (
              <div
                key={idx}
                className="flex flex-col justify-between border border-white/10 bg-white/[0.03] p-5 transition hover:border-[#c7a15a]/40"
              >
                <div>
                  <span className="text-[10px] uppercase tracking-[0.16em] text-white/50">{m.label}</span>
                  <p className="mt-3 font-serif text-3xl text-[#c7a15a]">{m.value}</p>
                </div>
                <p className="mt-3 border-t border-white/5 pt-2 text-[10px] text-white/40">{m.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Sections Opérationnelles : Prospects & Projets */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Derniers Prospects Détectés */}
          <section className="space-y-4 rounded border border-white/10 bg-white/[0.02] p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="font-serif text-lg text-white">Prospects Récents</h3>
                <p className="text-[11px] text-white/50">Entreprises cibles et détection de besoins</p>
              </div>
              <span className="text-[10px] text-white/40">{totalProspects} au total</span>
            </div>

            {prospectsList.length === 0 ? (
              <div className="py-8 text-center text-xs text-white/40">
                Aucun prospect technologique enregistré pour le moment.
              </div>
            ) : (
              <div className="space-y-2">
                {prospectsList.map((prospect) => (
                  <div
                    key={prospect.id}
                    className="flex items-center justify-between border border-white/5 bg-black/20 p-3 text-xs"
                  >
                    <div>
                      <p className="font-medium text-white">{prospect.companyName}</p>
                      <p className="text-[10px] text-white/40">
                        {prospect.sector || "Secteur non spécifié"} · {prospect.country || "France"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="border border-white/10 px-2 py-0.5 text-[9px] uppercase tracking-wider text-white/60">
                        {prospect.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Projets et Plateformes */}
          <section className="space-y-4 rounded border border-white/10 bg-white/[0.02] p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="font-serif text-lg text-white">Projets & Plateformes</h3>
                <p className="text-[11px] text-white/50">Suivi des réalisations et abonnements</p>
              </div>
              <span className="text-[10px] text-white/40">{projectsActive} actif(s)</span>
            </div>

            {projectsList.length === 0 ? (
              <div className="py-8 text-center text-xs text-white/40">
                Aucun projet technologique initié pour le moment.
              </div>
            ) : (
              <div className="space-y-2">
                {projectsList.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between border border-white/5 bg-black/20 p-3 text-xs"
                  >
                    <div>
                      <p className="font-medium text-white">{project.name}</p>
                      <p className="text-[10px] text-white/40">{project.techProspect.companyName}</p>
                    </div>
                    <span className="border border-[#c7a15a]/40 bg-[#c7a15a]/10 px-2 py-0.5 text-[9px] uppercase tracking-wider text-[#c7a15a]">
                      {project.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Charte & Cloisonnement */}
        <div className="border border-white/10 bg-black/30 p-5 text-xs text-white/50 leading-relaxed">
          <strong className="text-[#c7a15a]">🔒 Étanche et sécurisé :</strong> Les modèles, contacts et cahiers des charges du Pôle 2 sont hermétiques aux modules de recrutement (Pôle 1). Seuls les administrateurs pourvus de la permission explicite <code className="text-[#c7a15a]">TECH_SOLUTIONS_MANAGE</code> peuvent y être habilités par l&apos;Owner.
        </div>
      </div>
    </main>
  );
}
