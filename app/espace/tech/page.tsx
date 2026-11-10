import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/auth/permissions";

export default async function TechWorkspacePage() {
  const session = await auth();
  const userId = session?.user?.id;
  const role = session?.user?.role;

  // Redirection immédiate si non authentifié
  if (!userId || !role) {
    redirect("/connexion");
  }

  // Contrôle d'accès strict : OWNER inconditionnel, ADMIN/CONSULTANT uniquement si TECH_SOLUTIONS_MANAGE accordé
  const isOwner = role === "OWNER";
  const hasAccess = isOwner || (await hasPermission(userId, role, "TECH_SOLUTIONS_MANAGE"));

  if (!hasAccess) {
    redirect("/espace");
  }

  return (
    <main className="min-h-screen bg-[#081625] px-6 py-10 text-[#F8FAFC]">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="border-b border-white/10 pb-6">
          <span className="border border-[#c7a15a]/40 bg-[#c7a15a]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c7a15a]">
            Espace Collaborateur Pôle 2 · Solutions Technologiques
          </span>
          <h1 className="mt-3 font-serif text-3xl font-semibold sm:text-4xl">
            Portail Projets & Plateformes
          </h1>
          <p className="mt-2 text-xs text-white/60">
            Espace de travail réservé aux collaborateurs habilités pour la gestion des cahiers des charges, l&apos;analyse de faisabilité et le suivi des projets clients.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="border border-white/10 bg-white/[0.02] p-6 space-y-3">
            <h2 className="font-serif text-lg text-white">Cahiers des charges & Analyse</h2>
            <p className="text-xs text-white/50 leading-relaxed">
              Centralisez les besoins exprimés par les entreprises clientes et évaluez le périmètre fonctionnel de leur future solution numérique.
            </p>
            <div className="pt-2">
              <span className="inline-block border border-white/10 px-3 py-1 text-[10px] uppercase tracking-wider text-white/40">
                Phase de cadrage · Brique 1
              </span>
            </div>
          </div>

          <div className="border border-white/10 bg-white/[0.02] p-6 space-y-3">
            <h2 className="font-serif text-lg text-white">Chiffrages & Scénarios</h2>
            <p className="text-xs text-white/50 leading-relaxed">
              Préparez les scénarios de vente (Paiement initial + Mensualités récurrentes) pour les projets validés par l&apos;Owner.
            </p>
            <div className="pt-2">
              <span className="inline-block border border-white/10 px-3 py-1 text-[10px] uppercase tracking-wider text-white/40">
                Suivi des propositions et projets
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 pt-6">
          <Link
            href="/espace"
            className="border border-white/20 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-white/60 hover:text-white"
          >
            ← Retour à l&apos;espace général
          </Link>

          {isOwner && (
            <Link
              href="/espace/owner/solutions-tech"
              className="border border-[#c7a15a] bg-[#c7a15a]/10 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-[#c7a15a] hover:bg-[#c7a15a]/20"
            >
              Cockpit Owner Pôle 2 →
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
