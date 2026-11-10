import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";

const statusLabels: Record<string, string> = {
  CADRAGE: "Cadrage",
  DEVELOPPEMENT: "Développement",
  RECETTE: "Recette",
  LIVRE: "Livré",
  MAINTENANCE: "Maintenance",
  CLOTURE: "Clôturé",
};

const serviceFamilies = [
  {
    number: "01",
    title: "Sites web & e-commerce",
    description: "Sites vitrines, catalogues, boutiques en ligne et parcours de conversion adaptés à l’activité.",
    tags: ["Vitrine", "E-commerce", "Référencement"],
  },
  {
    number: "02",
    title: "Plateformes SaaS",
    description: "Applications accessibles en ligne, comptes utilisateurs, abonnements et espaces personnalisés.",
    tags: ["SaaS", "Multi-utilisateurs", "Abonnements"],
  },
  {
    number: "03",
    title: "CRM & outils de gestion",
    description: "Gestion commerciale, suivi client, tableaux de bord et automatisation des opérations.",
    tags: ["CRM", "Gestion", "Pilotage"],
  },
  {
    number: "04",
    title: "Portails clients & partenaires",
    description: "Espaces privés pour échanger des documents, suivre des demandes et coordonner les intervenants.",
    tags: ["Espace privé", "Documents", "Workflow"],
  },
  {
    number: "05",
    title: "Applications métier",
    description: "Outils conçus autour des processus réels d’une entreprise et de ses contraintes terrain.",
    tags: ["Sur mesure", "Processus", "Données"],
  },
  {
    number: "06",
    title: "Intégrations & automatisations",
    description: "Connexion des outils existants, circulation des données et réduction des tâches répétitives.",
    tags: ["API", "Intégration", "Automatisation"],
  },
];

const deliverySteps = [
  ["01", "Découverte", "Comprendre l’activité, les utilisateurs et les objectifs."],
  ["02", "Cadrage", "Formaliser le cahier des charges et les priorités."],
  ["03", "Conception", "Définir les parcours, l’architecture et l’interface."],
  ["04", "Chiffrage", "Présenter le périmètre, les délais et les conditions."],
  ["05", "Développement", "Construire la solution et suivre les jalons."],
  ["06", "Recette & livraison", "Tester, valider et mettre en ligne."],
  ["07", "Évolution", "Assurer maintenance, accompagnement et améliorations."],
];

export default async function TechWorkspacePage() {
  const session = await auth();
  const userId = session?.user?.id;
  const role = session?.user?.role;

  if (!userId || !role) redirect("/connexion");

  const isOwner = role === "OWNER";
  const hasAccess = isOwner || (await hasPermission(userId, role, "TECH_SOLUTIONS_MANAGE"));
  if (!hasAccess) redirect("/espace");

  // Les collaborateurs ne voient que les projets qui leur sont affectés.
  // L'OWNER conserve la vue complète du portefeuille Pôle 2.
  const projects = await prisma.techProject.findMany({
    where: isOwner
      ? undefined
      : {
          OR: [
            { projectManagerUserId: userId },
            { tasks: { some: { assigneeUserId: userId } } },
          ],
        },
    orderBy: [{ updatedAt: "desc" }],
    take: 30,
    select: {
      id: true,
      reference: true,
      name: true,
      description: true,
      status: true,
      estimatedDeliveryDate: true,
      updatedAt: true,
      techProspect: { select: { companyName: true } },
      tasks: {
        where: isOwner ? undefined : { assigneeUserId: userId },
        orderBy: { updatedAt: "desc" },
        take: 8,
        select: { id: true, title: true, status: true, dueAt: true },
      },
      milestones: {
        orderBy: { dueAt: "asc" },
        take: 5,
        select: { id: true, title: true, status: true, dueAt: true },
      },
    },
  });

  const activeProjects = projects.filter((project) =>
    ["CADRAGE", "DEVELOPPEMENT", "RECETTE"].includes(project.status),
  ).length;
  const openTasks = projects.reduce(
    (total, project) => total + project.tasks.filter((task) => task.status !== "TERMINE" && task.status !== "TERMINEE").length,
    0,
  );
  const deliveredProjects = projects.filter((project) =>
    ["LIVRE", "MAINTENANCE", "CLOTURE"].includes(project.status),
  ).length;

  return (
    <main className="min-h-screen bg-[#081625] px-5 py-8 text-[#F8FAFC] sm:px-8">
      <div className="mx-auto max-w-7xl space-y-10">
        <header className="relative overflow-hidden border border-white/10 bg-[radial-gradient(ellipse_at_top_right,_rgba(199,161,90,0.18),_transparent_48%),linear-gradient(120deg,#0d2235,#081625_65%)] p-7 sm:p-10">
          <div className="max-w-4xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#d8b875]">
              Pôle 2 · Solutions technologiques & plateformes sur mesure
            </p>
            <h1 className="mt-4 max-w-3xl font-serif text-3xl font-semibold leading-tight sm:text-5xl">
              Nous concevons les outils numériques qui font avancer les entreprises.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
              Sites web, logiciels métiers, CRM, portails clients et plateformes SaaS :
              un espace de travail dédié à la conception, au développement et au suivi
              de solutions numériques professionnelles.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#portefeuille" className="inline-flex min-h-11 items-center bg-[#c7a15a] px-5 text-sm font-semibold text-[#081625] transition hover:bg-[#dfc184]">
                Voir les projets suivis
              </a>
              <a href="#expertises" className="inline-flex min-h-11 items-center border border-white/20 px-5 text-sm text-white/85 transition hover:border-[#c7a15a]/70">
                Découvrir nos expertises
              </a>
            </div>
          </div>
          <div className="mt-9 grid max-w-3xl grid-cols-2 gap-3 border-t border-white/10 pt-6 sm:grid-cols-4">
            {[
              ["01", "Comprendre le besoin"],
              ["02", "Concevoir la solution"],
              ["03", "Développer & tester"],
              ["04", "Déployer & accompagner"],
            ].map(([n, label]) => (
              <div key={n}>
                <p className="text-xs tracking-[0.18em] text-[#c7a15a]">{n}</p>
                <p className="mt-2 text-xs text-white/65">{label}</p>
              </div>
            ))}
          </div>
        </header>

        <section id="portefeuille" className="space-y-5">
          <div className="flex flex-col justify-between gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#c7a15a]">Espace de production</p>
              <h2 className="mt-2 font-serif text-2xl sm:text-3xl">Portefeuille de projets</h2>
              <p className="mt-2 text-sm text-white/55">
                {isOwner ? "Vue complète des réalisations technologiques." : "Projets et tâches qui vous sont affectés."}
              </p>
            </div>
            {isOwner && (
              <Link href="/espace/owner/solutions-tech/crm" className="inline-flex min-h-10 items-center border border-[#c7a15a]/50 px-4 text-xs font-semibold text-[#e2c17e] hover:bg-[#c7a15a]/10">
                Ouvrir le CRM & pilotage commercial →
              </Link>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Projets en phase active", activeProjects, "Cadrage, développement ou recette"],
              ["Tâches ouvertes", openTasks, "Actions encore à réaliser"],
              ["Livrés / accompagnés", deliveredProjects, "Livraison, maintenance ou clôture"],
            ].map(([label, value, note]) => (
              <div key={String(label)} className="border border-white/10 bg-white/[0.03] p-5">
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">{label}</p>
                <p className="mt-3 font-serif text-3xl text-[#d8b875]">{value}</p>
                <p className="mt-2 text-xs text-white/40">{note}</p>
              </div>
            ))}
          </div>

          {projects.length === 0 ? (
            <div className="border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center">
              <p className="font-serif text-xl text-white/85">Votre espace de production est prêt.</p>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/50">
                Les projets apparaîtront ici dès qu’ils vous seront affectés. Le Pôle 2
                est consacré exclusivement aux solutions numériques des entreprises.
              </p>
              {isOwner && (
                <Link href="/espace/owner/solutions-tech/crm" className="mt-5 inline-flex min-h-10 items-center bg-[#c7a15a] px-4 text-xs font-semibold text-[#081625]">
                  Accéder au CRM pour lancer un projet
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {projects.map((project) => (
                <article key={project.id} className="border border-white/10 bg-white/[0.025] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-[#c7a15a]">{project.reference}</p>
                      <h3 className="mt-2 font-serif text-xl">{project.name}</h3>
                      <p className="mt-1 text-xs text-white/50">{project.techProspect.companyName}</p>
                    </div>
                    <span className="border border-[#c7a15a]/40 bg-[#c7a15a]/10 px-3 py-1 text-[10px] uppercase tracking-wider text-[#e2c17e]">
                      {statusLabels[project.status] || project.status}
                    </span>
                  </div>
                  {project.description && <p className="mt-4 text-sm leading-6 text-white/60">{project.description}</p>}
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">Tâches affectées</p>
                      {project.tasks.length ? (
                        <ul className="mt-2 space-y-2">
                          {project.tasks.map((task) => (
                            <li key={task.id} className="border-l border-[#c7a15a]/60 pl-3 text-xs text-white/75">
                              {task.title}
                              <span className="ml-2 text-white/35">· {task.status}</span>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="mt-2 text-xs text-white/35">Aucune tâche affectée.</p>}
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">Prochains jalons</p>
                      {project.milestones.length ? (
                        <ul className="mt-2 space-y-2">
                          {project.milestones.map((milestone) => (
                            <li key={milestone.id} className="border-l border-white/20 pl-3 text-xs text-white/75">
                              {milestone.title}
                              <span className="ml-2 text-white/35">· {milestone.status}</span>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="mt-2 text-xs text-white/35">Aucun jalon défini.</p>}
                    </div>
                  </div>
                  {project.estimatedDeliveryDate && (
                    <p className="mt-4 border-t border-white/10 pt-3 text-xs text-white/45">
                      Livraison prévisionnelle : {new Intl.DateTimeFormat("fr-FR").format(project.estimatedDeliveryDate)}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="expertises" className="space-y-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#c7a15a]">Nos domaines d’intervention</p>
            <h2 className="mt-2 font-serif text-2xl sm:text-3xl">Des solutions adaptées à chaque activité</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {serviceFamilies.map((service) => (
              <article key={service.number} className="group border border-white/10 bg-white/[0.025] p-5 transition hover:border-[#c7a15a]/45 hover:bg-white/[0.045]">
                <p className="text-xs tracking-[0.2em] text-[#c7a15a]">{service.number}</p>
                <h3 className="mt-4 font-serif text-xl">{service.title}</h3>
                <p className="mt-3 min-h-[4.5rem] text-sm leading-6 text-white/55">{service.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {service.tags.map((tag) => (
                    <span key={tag} className="border border-white/10 px-2 py-1 text-[10px] text-white/45">{tag}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="border border-white/10 bg-[#0d2031] p-6 sm:p-8">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#c7a15a]">Méthode de réalisation</p>
          <h2 className="mt-2 font-serif text-2xl">Du besoin métier à la solution en production</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {deliverySteps.map(([number, title, description]) => (
              <div key={number} className="border-t border-[#c7a15a]/40 pt-3">
                <p className="text-[10px] tracking-[0.2em] text-[#c7a15a]">{number}</p>
                <h3 className="mt-2 text-sm font-semibold">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-white/50">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-xs text-white/40">
          <span>Pôle 2 · Espace sécurisé des solutions technologiques</span>
          <Link href="/espace" className="text-white/60 hover:text-white">← Retour à l’espace général</Link>
        </footer>
      </div>
    </main>
  );
}
