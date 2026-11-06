import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import BackButton from "@/components/navigation/BackButton";

function formatDate(value: Date | null) {
  if (!value) return "Non renseignée";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(value);
}

function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export default async function OwnerOfferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  const role = session?.user?.role;
  if (!userId || !["OWNER", "ADMIN", "CONSULTANT"].includes(role || "")) redirect("/connexion");
  if (!(await hasPermission(userId, role, "OFFRES_VIVIER"))) {
    const fallbackRedirect = role === "ADMIN" ? "/espace/admin" : role === "CONSULTANT" ? "/espace/consultant" : "/espace";
    redirect(fallbackRedirect);
  }

  const { id } = await params;
  const offer = await prisma.externalJobOpportunity.findUnique({
    where: { id },
    select: {
      id: true,
      externalId: true,
      source: true,
      sourceUrl: true,
      sourceType: true,
      sourceCollectedAt: true,
      title: true,
      companyName: true,
      country: true,
      city: true,
      categoryCode: true,
      subCategoryCode: true,
      skills: true,
      experienceYears: true,
      language: true,
      salary: true,
      publishedAt: true,
      closingAt: true,
      description: true,
      translations: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!offer) notFound();

  const skills = readStringList(offer.skills);
  const translationRoot = offer.translations && typeof offer.translations === "object" && !Array.isArray(offer.translations) ? offer.translations as Record<string, unknown> : {};
  const frenchRaw = translationRoot.fr && typeof translationRoot.fr === "object" && !Array.isArray(translationRoot.fr) ? translationRoot.fr as Record<string, unknown> : null;
  const frenchTitle = typeof frenchRaw?.titleFr === "string" ? frenchRaw.titleFr.trim() : "";
  const frenchDescription = typeof frenchRaw?.descriptionFr === "string" ? frenchRaw.descriptionFr.trim() : "";
  const frenchSummary = typeof frenchRaw?.summaryFr === "string" ? frenchRaw.summaryFr.trim() : "";
  const sourceLanguage = typeof frenchRaw?.sourceLanguage === "string" ? frenchRaw.sourceLanguage : "";
  const autoTranslated = frenchRaw?.isAutoTranslated === true;

  return (
    <section className="mx-auto w-[min(1100px,calc(100%-40px))] py-10 md:py-16">
      <BackButton />
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#c7a15a]">Owner · Vivier des offres · Détail intégral</p>
        <Link href="/espace/owner/offres-vivier" className="text-xs text-white/60 hover:text-white">Retour au vivier</Link>
      </div>

      <header className="mt-5 border border-white/10 bg-[#0b0f14] p-6 md:p-9">
        <p className="text-xs uppercase tracking-[0.16em] text-[#F97316]">{offer.status}</p>
        <h1 className="mt-3 font-serif text-3xl text-white md:text-5xl">{offer.title}</h1>
        {frenchTitle && frenchTitle !== offer.title ? <p className="mt-3 text-lg text-[#c7a15a]">Version française : {frenchTitle}</p> : null}
        {sourceLanguage ? <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-white/35">Langue source : {sourceLanguage} · {autoTranslated ? "Traduction automatique" : "Texte français original"}</p> : null}
        <p className="mt-4 text-sm text-white/60">{offer.companyName || "Entreprise non renseignée"} · {[offer.city, offer.country].filter(Boolean).join(", ") || "Localisation non renseignée"}</p>
        <p className="mt-6 text-2xl font-semibold text-[#F97316]">{offer.salary || "Salaire non communiqué par la source"}</p>
        {offer.sourceUrl ? (
          <a href={offer.sourceUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex border border-[#c7a15a]/70 px-4 py-3 text-[10px] uppercase tracking-[0.16em] text-[#c7a15a] hover:bg-[#c7a15a]/10">
            Consulter l’annonce originale
          </a>
        ) : (
          <p className="mt-5 text-xs text-white/35">Aucune URL source n’est enregistrée pour cette offre.</p>
        )}
      </header>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="border border-white/10 p-5">
          <h2 className="text-xs uppercase tracking-[0.18em] text-[#c7a15a]">Informations de l’offre</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div><dt className="text-white/35">Métier / catégorie</dt><dd className="mt-1 text-white/80">{offer.categoryCode || "Non renseigné"}{offer.subCategoryCode ? " · " + offer.subCategoryCode : ""}</dd></div>
            <div><dt className="text-white/35">Expérience demandée</dt><dd className="mt-1 text-white/80">{offer.experienceYears === null ? "Non renseignée" : offer.experienceYears + " an(s)"}</dd></div>
            <div><dt className="text-white/35">Langue</dt><dd className="mt-1 text-white/80">{offer.language || "Non renseignée"}</dd></div>
            <div><dt className="text-white/35">Publication</dt><dd className="mt-1 text-white/80">{formatDate(offer.publishedAt)}</dd></div>
            <div><dt className="text-white/35">Date limite</dt><dd className="mt-1 text-white/80">{formatDate(offer.closingAt)}</dd></div>
          </dl>
        </div>
        <div className="border border-white/10 p-5">
          <h2 className="text-xs uppercase tracking-[0.18em] text-[#c7a15a]">Provenance et suivi</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div><dt className="text-white/35">Source</dt><dd className="mt-1 text-white/80">{offer.source}</dd></div>
            <div><dt className="text-white/35">Type de source</dt><dd className="mt-1 text-white/80">{offer.sourceType || "Non renseigné"}</dd></div>
            <div><dt className="text-white/35">Collecte</dt><dd className="mt-1 text-white/80">{formatDate(offer.sourceCollectedAt)}</dd></div>
            <div><dt className="text-white/35">Identifiant externe</dt><dd className="mt-1 break-all text-white/80">{offer.externalId}</dd></div>
            <div><dt className="text-white/35">Ajout dans le vivier</dt><dd className="mt-1 text-white/80">{formatDate(offer.createdAt)}</dd></div>
          </dl>
        </div>
      </div>

      {frenchSummary ? (
        <section className="mt-6 border border-[#c7a15a]/30 bg-[#c7a15a]/5 p-5 md:p-8">
          <h2 className="text-xs uppercase tracking-[0.18em] text-[#c7a15a]">Résumé en français</h2>
          <p className="mt-4 text-sm leading-7 text-white/80">{frenchSummary}</p>
        </section>
      ) : null}

      <section className="mt-6 border border-white/10 p-5 md:p-8">
        <h2 className="text-xs uppercase tracking-[0.18em] text-[#c7a15a]">Description intégrale de l’offre · originale</h2>
        {offer.description ? (
          <div className="mt-5 whitespace-pre-wrap break-words text-sm leading-7 text-white/80">{offer.description}</div>
        ) : (
          <p className="mt-5 text-sm leading-7 text-white/45">La source n’a fourni aucun descriptif exploitable pour cette offre. Consulte l’annonce originale si son lien est disponible.</p>
        )}
      </section>

      {frenchDescription && frenchDescription !== offer.description ? (
        <section className="mt-6 border border-white/10 p-5 md:p-8">
          <h2 className="text-xs uppercase tracking-[0.18em] text-[#c7a15a]">Description intégrale · traduction française</h2>
          <div className="mt-5 whitespace-pre-wrap break-words text-sm leading-7 text-white/80">{frenchDescription}</div>
        </section>
      ) : null}

      <section className="mt-6 border border-white/10 p-5 md:p-8">
        <h2 className="text-xs uppercase tracking-[0.18em] text-[#c7a15a]">Compétences identifiées</h2>
        {skills.length ? (
          <ul className="mt-4 flex flex-wrap gap-2">{skills.map((skill) => <li key={skill} className="border border-white/15 px-3 py-2 text-xs text-white/75">{skill}</li>)}</ul>
        ) : (
          <p className="mt-4 text-sm text-white/40">Aucune compétence structurée n’est enregistrée.</p>
        )}
      </section>
    </section>
  );
}
