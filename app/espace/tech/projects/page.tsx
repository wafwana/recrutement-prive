import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";

export default async function TechProjectsPage() {
  const activeSession = getActiveSessionContext();
  const session = activeSession || (await auth());
  if (!session?.user?.id) {
    redirect("/connexion");
  }

  const role = session.user.role as string;
  const isAllowed = await hasPermission(session.user.id, role, "TECH_SOLUTIONS_MANAGE");
  if (!isAllowed) {
    redirect("/espace");
  }

  const projects = await prisma.techProject.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      techProspect: {
        select: {
          id: true,
          companyName: true,
          contactName: true,
          status: true,
        },
      },
    },
    take: 50,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/espace/tech" className="hover:underline">Espace Pôle 2</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Projets & Abonnements</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Pilotage des Plateformes & Abonnements</h1>
          <p className="text-sm text-gray-600 mt-1">
            Suivi des cycles de réalisation, des livrables, des dépôts GitHub et des revenus récurrents (MRR).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/espace/owner/solutions-tech"
            className="px-3 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
          >
            Cockpit Owner
          </Link>
        </div>
      </div>

      {/* Sommaire des projets */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Cadrage", count: projects.filter((p) => p.status === "CADRAGE").length, bg: "bg-blue-50 text-blue-700 border-blue-200" },
          { label: "Développement", count: projects.filter((p) => p.status === "DEVELOPPEMENT").length, bg: "bg-amber-50 text-amber-700 border-amber-200" },
          { label: "Recette", count: projects.filter((p) => p.status === "RECETTE").length, bg: "bg-purple-50 text-purple-700 border-purple-200" },
          { label: "Livrés", count: projects.filter((p) => p.status === "LIVRE").length, bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
          { label: "Maintenance", count: projects.filter((p) => p.status === "MAINTENANCE").length, bg: "bg-indigo-50 text-indigo-700 border-indigo-200" },
          { label: "Clôturés", count: projects.filter((p) => p.status === "CLOTURE").length, bg: "bg-gray-50 text-gray-700 border-gray-200" },
        ].map((item) => (
          <div key={item.label} className={`border rounded-lg p-3 text-center ${item.bg}`}>
            <p className="text-xs font-semibold uppercase tracking-wider">{item.label}</p>
            <p className="text-xl font-bold mt-1">{item.count}</p>
          </div>
        ))}
      </div>

      {/* Tableau des projets */}
      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Projets en cours ({projects.length})
          </h2>
        </div>

        {projects.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="font-medium">Aucun projet actif pour le moment.</p>
            <p className="text-sm mt-1">Lorsqu'un prospect valide son cahier des charges et signe sa proposition, son projet apparaît ici.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 font-medium border-b text-xs uppercase">
                <tr>
                  <th className="px-6 py-3">Projet & Client</th>
                  <th className="px-6 py-3">Phase / Statut</th>
                  <th className="px-6 py-3">Forfait Initial</th>
                  <th className="px-6 py-3">Abonnement MRR</th>
                  <th className="px-6 py-3">Dépôt GitHub</th>
                  <th className="px-6 py-3">Livraison Prévue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{p.name}</div>
                      <div className="text-xs text-gray-500">{p.techProspect.companyName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.status === "MAINTENANCE" || p.status === "LIVRE"
                          ? "bg-green-100 text-green-800"
                          : p.status === "DEVELOPPEMENT"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {p.setupPrice ? `${p.setupPrice.toLocaleString("fr-FR")} ${p.currency}` : "-"}
                    </td>
                    <td className="px-6 py-4 font-semibold text-emerald-600">
                      {p.monthlySubscriptionPrice ? `${p.monthlySubscriptionPrice.toLocaleString("fr-FR")} ${p.currency}/mois` : "-"}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {p.repositoryUrl ? (
                        <a href={p.repositoryUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          Voir code →
                        </a>
                      ) : (
                        <span className="text-gray-400">Non renseigné</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {p.estimatedDeliveryDate ? new Date(p.estimatedDeliveryDate).toLocaleDateString("fr-FR") : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
