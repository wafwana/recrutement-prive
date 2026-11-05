import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";

export default async function TechProspectsPage() {
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

  const prospects = await prisma.techProspect.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      requirements: { select: { id: true, title: true, status: true } },
      projects: { select: { id: true, name: true, status: true } },
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
            <span className="text-gray-900 font-medium">CRM Prospects</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Portefeuille Commercial & Prospection</h1>
          <p className="text-sm text-gray-600 mt-1">
            Identification des besoins technologiques, qualification des entreprises et suivi du pipeline de vente.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/espace/owner/solutions-tech"
            className="px-3 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
          >
            Cockpit Métriques
          </Link>
        </div>
      </div>

      {/* Pipeline Status Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {[
          { label: "Nouveaux", count: prospects.filter((p) => p.status === "NOUVEAU").length, bg: "bg-blue-50 text-blue-700 border-blue-200" },
          { label: "À qualifier", count: prospects.filter((p) => p.status === "A_QUALIFIER").length, bg: "bg-amber-50 text-amber-700 border-amber-200" },
          { label: "Qualifiés", count: prospects.filter((p) => p.status === "QUALIFIE").length, bg: "bg-indigo-50 text-indigo-700 border-indigo-200" },
          { label: "CDC Reçus", count: prospects.filter((p) => p.status === "CDC_RECU").length, bg: "bg-purple-50 text-purple-700 border-purple-200" },
          { label: "Signés", count: prospects.filter((p) => p.status === "SIGNE").length, bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
        ].map((item) => (
          <div key={item.label} className={`border rounded-lg p-3 text-center ${item.bg}`}>
            <p className="text-xs font-semibold uppercase tracking-wider">{item.label}</p>
            <p className="text-xl font-bold mt-1">{item.count}</p>
          </div>
        ))}
      </div>

      {/* Prospects Table */}
      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Prospects enregistrés ({prospects.length})
          </h2>
        </div>

        {prospects.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="font-medium">Aucun prospect enregistré pour le moment.</p>
            <p className="text-sm mt-1">Utilisez l'API ou importez des prospects pour alimenter le pipeline commercial.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 font-medium border-b text-xs uppercase">
                <tr>
                  <th className="px-6 py-3">Entreprise</th>
                  <th className="px-6 py-3">Contact</th>
                  <th className="px-6 py-3">Statut Pipeline</th>
                  <th className="px-6 py-3">Priorité</th>
                  <th className="px-6 py-3">Budget</th>
                  <th className="px-6 py-3">Dossiers liés</th>
                  <th className="px-6 py-3">Créé le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {prospects.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{p.companyName}</div>
                      <div className="text-xs text-gray-500">
                        {p.siret ? `SIRET: ${p.siret}` : p.siren ? `SIREN: ${p.siren}` : p.sector || "Non spécifié"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900">{p.contactName || "Non renseigné"}</div>
                      <div className="text-xs text-gray-500">{p.contactEmail || p.contactRole || "-"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.status === "SIGNE"
                          ? "bg-green-100 text-green-800"
                          : p.status === "CDC_RECU"
                          ? "bg-purple-100 text-purple-800"
                          : p.status === "ABANDONNE"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                        p.priority === "URGENTE"
                          ? "bg-red-50 text-red-700"
                          : p.priority === "HAUTE"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        {p.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {p.estimatedBudget ? `${p.estimatedBudget.toLocaleString("fr-FR")} €` : "-"}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div>{p.requirements.length} CDC</div>
                      <div>{p.projects.length} Projet(s)</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(p.createdAt).toLocaleDateString("fr-FR")}
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
