import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";

export default async function TechRequirementsPage() {
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

  const requirements = await prisma.techRequirementDoc.findMany({
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
            <span className="text-gray-900 font-medium">Cahiers des charges</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Analyse Technique & Faisabilité</h1>
          <p className="text-sm text-gray-600 mt-1">
            Décomposition modulaire des besoins, identification des composants réutilisables et estimations d'effort.
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

      {/* Liste des cahiers des charges */}
      <div className="space-y-4">
        {requirements.length === 0 ? (
          <div className="bg-white border rounded-xl p-8 text-center text-gray-500 shadow-sm">
            <p className="font-medium">Aucun cahier des charges déposé pour le moment.</p>
            <p className="text-sm mt-1">Les besoins clients analysés apparaîtront ici avec leur score de couverture technique.</p>
          </div>
        ) : (
          requirements.map((doc) => {
            const quote = doc.estimatedQuote as any;
            const features = (doc.featuresAnalysis as any[]) || [];

            return (
              <div key={doc.id} className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                      {doc.techProspect.companyName}
                    </span>
                    <h2 className="text-lg font-bold text-gray-900">{doc.title}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                      doc.status === "VALIDE"
                        ? "bg-green-100 text-green-800"
                        : doc.status === "REJETE"
                        ? "bg-red-100 text-red-800"
                        : "bg-blue-100 text-blue-800"
                    }`}>
                      {doc.status}
                    </span>
                  </div>
                </div>

                {doc.description && (
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border">
                    {doc.description}
                  </p>
                )}

                {/* Métriques d'analyse */}
                {quote && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-lg border text-sm">
                    <div>
                      <span className="text-xs text-gray-500 block">Réutilisabilité RP</span>
                      <span className="font-bold text-emerald-600 text-base">
                        {quote.reusabilityPercentage ?? "-"} %
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block">Charge totale estimée</span>
                      <span className="font-bold text-gray-900 text-base">
                        {quote.effort?.totalDays ?? "-"} jours
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block">Niveau de risque</span>
                      <span className="font-bold text-gray-900 text-base">
                        {quote.risk?.level ?? "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block">Fourchette Setup</span>
                      <span className="font-bold text-indigo-600 text-base">
                        {quote.pricing?.setupMin?.toLocaleString("fr-FR")} - {quote.pricing?.setupMax?.toLocaleString("fr-FR")} €
                      </span>
                    </div>
                  </div>
                )}

                {/* Catégories fonctionnelles */}
                {features.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Couverture des fonctionnalités ({features.length} modules détectés)
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {features.map((feat, idx) => (
                        <div key={idx} className="border rounded-md p-2.5 text-xs bg-white">
                          <div className="flex justify-between items-center font-semibold text-gray-900 mb-1">
                            <span>{feat.name}</span>
                            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                              {feat.reusabilityScore}% réutilisable
                            </span>
                          </div>
                          <p className="text-gray-500">{feat.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
