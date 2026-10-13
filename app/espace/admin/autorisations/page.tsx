import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserPermissions, type Permission } from "@/lib/auth/permissions";

const PERMISSION_LABELS: Record<Permission, { title: string; description: string; category: string }> = {
  CANDIDATES_VIEW: { title: "Consultation du Vivier Candidats", description: "Accès en lecture aux profils et candidatures du vivier.", category: "Candidats" },
  CANDIDATES_MANAGE: { title: "Gestion des Candidats", description: "Mise à jour et qualification des candidats.", category: "Candidats" },
  CV_INTAKE: { title: "Intégration de CV", description: "Dépôt et traitement IA des documents CV.", category: "Candidats" },
  CV_LIBRARY: { title: "Bibliothèque de CV", description: "Accès à la CVthèque globale de la plateforme.", category: "Candidats" },
  CV_MATCHING: { title: "Matching CV / Offres", description: "Moteur de rapprochement automatisé des profils et missions.", category: "Matching" },
  METIERS_DOSSIERS: { title: "Métiers & Dossiers", description: "Gestion de la taxonomie métier et des dossiers de candidature.", category: "Taxonomie" },
  SOURCING: { title: "Sourcing Automatique", description: "Recherche et qualification d'offres et profils externes.", category: "Sourcing" },
  OFFRES_VIVIER: { title: "Vivier d'Offres", description: "Gestion du vivier centralisé d'offres d'emploi.", category: "Missions" },
  ARCHIVAGE: { title: "Archivage Documentaire", description: "Accès à l'archivage sécurisé des documents applicatifs.", category: "Documents" },
  PRE_COMPTABILITE: { title: "Pré-Comptabilité", description: "Consultation des dossiers comptables et pièces justificatives.", category: "Finance" },
  PRESTATIONS_TARIFS: { title: "Prestations & Tarifs", description: "Gestion des grilles tarifaires et prestations de recrutement.", category: "Finance" },
  FACTURATION: { title: "Honoraires & Facturation", description: "Suivi de la facturation et des appels d'honoraires.", category: "Finance" },
  JOBS_MANAGE: { title: "Gestion des Offres & Missions", description: "Création, édition et suivi des offres d'emploi.", category: "Missions" },
  PRESENTATIONS_MANAGE: { title: "Présentations Candidats", description: "Soumission et suivi des candidatures présentées aux clients.", category: "Recrutement" },
  COMPANIES_MANAGE: { title: "Gestion des Entreprises", description: "Administration des comptes entreprises et comptes clients.", category: "Entreprises" },
  CRM: { title: "CRM & Relations Clients", description: "Suivi de la relation commerciale et de la prospection.", category: "CRM" },
  REPORTING: { title: "Reporting & Statistiques", description: "Consultation des tableaux de bord consolidés et de l'activité.", category: "Reporting" },
  DOCUMENTS_DEPOSIT: { title: "Dépôt de Documents", description: "Dépôt de pièces justificatives et documents contractuels.", category: "Documents" },
  DOCUMENTS_VIEW: { title: "Consultation de Documents", description: "Lecture et téléchargement des documents de la plateforme.", category: "Documents" },
  MESSAGING_CLIENTS_ENTERPRISE: { title: "Messagerie Clients / Entreprises", description: "Communication directe avec les recruteurs et clients.", category: "Messagerie" },
  PLATFORM_SETTINGS: { title: "Configuration Plateforme", description: "Gestion des paramètres globaux de fonctionnement.", category: "Configuration" },
  ENTERPRISE_OFFER_SOURCING: { title: "Sourcing Offres Entreprises", description: "Collecte et qualification automatisée d'offres externes.", category: "Sourcing" },
  PARTNERS_MANAGE: { title: "Partenaires & Sources", description: "Gestion des partenaires institutionnels, éducatifs, associatifs et réseaux d'expatriés.", category: "Partenaires" },
  SECURE_CONTACTS_AUTHORIZE: { title: "Autorisation des contacts sécurisés", description: "Autoriser ou refuser les contacts sécurisés pour le compte du cabinet.", category: "Executive Search" },
};

export default async function AdminAutorisationsPage() {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "OWNER")) {
    redirect("/connexion");
  }

  const role = session.user.role;
  const isOwner = role === "OWNER";

  const permissionsList = await getUserPermissions(session.user.id);
  const activePermissions = isOwner
    ? (Object.keys(PERMISSION_LABELS) as Permission[])
    : permissionsList || [];

  return (
    <section className="mx-auto w-[min(1100px,calc(100%-40px))] py-14 md:w-[min(1100px,calc(100%-72px))] md:py-20">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Espace Administration</p>
          <h1 className="mt-3 font-serif text-4xl sm:text-5xl">Mes Autorisations Actives</h1>
        </div>
        <Link
          href="/espace/admin"
          className="border border-white/20 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-white/70 hover:border-white/40"
        >
          Retour au Pilotage
        </Link>
      </div>

      <p className="mt-5 max-w-3xl text-sm leading-7 text-white/60">
        Ce tableau présente exclusivement les modules, fonctionnalités et périmètres d&apos;actions qui vous sont{" "}
        <strong className="text-white">explicitement accordés par l&apos;Owner</strong>. Les fonctionnalités non accordées
        sont strictement retirées de votre espace de travail.
      </p>

      {isOwner && (
        <div className="mt-8 border border-[#c7a15a]/40 bg-[#c7a15a]/10 p-5 text-sm text-[#c7a15a]">
          En tant qu&apos;<strong>OWNER</strong>, vous disposez de l&apos;autorité suprême et de l&apos;ensemble des permissions applicatives. Vous pouvez configurer les accès des administrateurs depuis le Cockpit Owner.
        </div>
      )}

      <div className="mt-10 border border-white/10 bg-[#111] p-8">
        <div className="flex items-center justify-between border-b border-white/10 pb-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#c7a15a]">Compte Collaborateur</p>
            <p className="mt-2 font-serif text-2xl text-white">{session.user.name || session.user.email}</p>
            <p className="mt-1 text-xs text-white/40">{session.user.email}</p>
          </div>
          <span className="border border-[#c7a15a]/40 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[#c7a15a]">
            Rôle : {role}
          </span>
        </div>

        <div className="mt-8">
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">
            Permissions Actives ({activePermissions.length})
          </p>

          {activePermissions.length === 0 ? (
            <p className="mt-6 text-sm text-white/40">
              Aucune permission spécifique n&apos;est actuellement active sur votre compte. Veuillez contacter l&apos;Owner pour toute attribution de droit.
            </p>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activePermissions.map((permission) => {
                const info = PERMISSION_LABELS[permission] || {
                  title: permission,
                  description: "Permission explicite accordée par l'Owner.",
                  category: "Général",
                };

                return (
                  <div key={permission} className="flex flex-col justify-between border border-white/10 bg-[#0b0b0b] p-5">
                    <div>
                      <span className="border border-[#c7a15a]/30 px-2 py-0.5 text-[9px] uppercase tracking-wider text-[#c7a15a]">
                        {info.category}
                      </span>
                      <h2 className="mt-3 font-serif text-lg text-white/90">{info.title}</h2>
                      <p className="mt-2 text-xs leading-5 text-white/50">{info.description}</p>
                    </div>
                    <div className="mt-5 border-t border-white/10 pt-3 text-[10px] font-mono uppercase text-emerald-400">
                      ✓ ACTIF
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
