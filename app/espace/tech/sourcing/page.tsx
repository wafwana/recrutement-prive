import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";

export default async function TechSourcingPage() {
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

  const sourcedProspects = await prisma.techProspect.findMany({
    where: { status: "A_QUALIFIER" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/espace/tech" className="hover:underline">Espace Pôle 2</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Sourcing International</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Détection & Prospection d'Entreprises Cibles</h1>
          <p className="text-sm text-gray-600 mt-1">
            Veille technologique, détection des signaux d'opportunités numériques (France & International) et qualification commerciale.
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

      {/* Sommaire des opportunités */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-blue-200 bg-blue-50/50 p-5 rounded-xl">
          <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider block">Entreprises à qualifier</span>
          <p className="text-2xl font-bold text-blue-900 mt-1">{sourcedProspects.length}</p>
          <p className="text-xs text-blue-600 mt-1">Opportunités identifiées via les registres publics et la veille.</p>
        </div>

        <div className="border border-emerald-200 bg-emerald-50/50 p-5 rounded-xl">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block">Qualification & Dédoublonnage</span>
          <p className="text-sm font-medium text-emerald-900 mt-2">Anti-doublon par SIREN/SIRET et nom de domaine.</p>
          <p className="text-xs text-emerald-600 mt-1">Score calculé sur 100 points avec critères explicables.</p>
        </div>

        <div className="border border-purple-200 bg-purple-50/50 p-5 rounded-xl">
          <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider block">Gouvernance OWNER</span>
          <p className="text-sm font-medium text-purple-900 mt-2">Contrôle strict des prises de contact.</p>
          <p className="text-xs text-purple-600 mt-1">Zéro sollicitation automatique sans validation humaine.</p>
        </div>
      </div>

      {/* Tableau des entreprises sourcées */}
      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Entreprises détectées en attente de qualification ({sourcedProspects.length})
          </h2>
        </div>

        {sourcedProspects.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="font-medium">Aucune entreprise en attente de qualification.</p>
            <p className="text-sm mt-1">Les opportunités détectées apparaîtront ici pour analyse et transfert vers le CRM.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 font-medium border-b text-xs uppercase">
                <tr>
                  <th className="px-6 py-3">Entreprise & Localisation</th>
                  <th className="px-6 py-3">Secteur</th>
                  <th className="px-6 py-3">Source & Signaux</th>
                  <th className="px-6 py-3">Score & Priorité</th>
                  <th className="px-6 py-3">Besoin Détecté</th>
                  <th className="px-6 py-3">Date de Collecte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sourcedProspects.map((p) => {
                  const detection = p.detectionSignals as any;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{p.companyName}</div>
                        <div className="text-xs text-gray-500">
                          {p.country}{p.city ? ` · ${p.city}` : ""}
                          {p.website ? ` · ${p.website}` : ""}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-medium">
                          {p.sector || "Non spécifié"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <div className="font-medium text-gray-800">{detection?.source || "Veille publique"}</div>
                        <div className="text-gray-500">{Array.isArray(detection?.signals) ? detection.signals.join(", ") : "Signaux généraux"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">
                          {detection?.qualificationScore ? `${detection.qualificationScore}/100` : "-"}
                        </div>
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${
                          p.priority === "HAUTE" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-600"
                        }`}>
                          {p.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600 max-w-xs truncate">
                        {detection?.potentialTechNeed || "Portail ou refonte sur mesure"}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {new Date(p.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
