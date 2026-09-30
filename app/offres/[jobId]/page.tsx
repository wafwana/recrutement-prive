import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { translateJobOfferToFrench } from "@/lib/jobs/translation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ jobId: string }> };

export default async function JobOfferPage({ params }: Props) {
  const { jobId } = await params;
  let job: {
    id: string;
    title: string;
    location: string | null;
    description: string | null;
    missionType: string | null;
    requiredSkills: unknown;
    requiredExperienceYears: number | null;
    translations: unknown;
    createdAt: Date;
    company: { name: string; description: string | null; website: string | null };
  } | null = null;

  try {
    job = await prisma.job.findFirst({
      where: { id: jobId, status: "OPEN" },
      select: {
        id: true,
        title: true,
        location: true,
        description: true,
        missionType: true,
        requiredSkills: true,
        requiredExperienceYears: true,
        translations: true,
        createdAt: true,
        company: { select: { name: true, description: true, website: true } },
      },
    });
  } catch {
    notFound();
  }

  if (!job) notFound();

  // Retrieve or compute French translation
  let frenchTranslation = (job.translations as any)?.fr;
  if (!frenchTranslation) {
    const skillsList = Array.isArray(job.requiredSkills)
      ? (job.requiredSkills as unknown[]).filter((s): s is string => typeof s === "string")
      : [];

    const translated = await translateJobOfferToFrench({
      title: job.title,
      description: job.description,
      location: job.location,
      missionType: job.missionType,
      skills: skillsList,
      experienceYears: job.requiredExperienceYears,
    });

    frenchTranslation = {
      title: translated.titleFr,
      description: translated.descriptionFr,
      summary: translated.summaryFr,
      sourceLanguage: translated.sourceLanguage,
      isAutoTranslated: translated.isAutoTranslated,
      translatedAt: translated.translatedAt,
    };

    // Persist translation back to DB asynchronously if possible
    try {
      await prisma.job.update({
        where: { id: job.id },
        data: { translations: { fr: frenchTranslation } },
      });
    } catch {
      // Non-blocking write
    }
  }

  const displayTitle = frenchTranslation.title || job.title;
  const displayDescription = frenchTranslation.description || job.description;

  return (
    <main className="rp-site min-h-screen">
      <header className="rp-header">
        <Link href="/" className="rp-brand" aria-label="Recrutement Privé - accueil">
          <span className="rp-logo">RP</span>
          <span><strong>RECRUTEMENT PRIVÉ</strong><small>EXPERT RECRUTEMENT</small></span>
        </Link>
        <nav className="rp-nav" aria-label="Navigation principale">
          <Link href="/">Accueil</Link>
          <Link href="/offres" className="active">Offres</Link>
          <Link href="/#entreprises">Entreprises</Link>
          <Link href="/#contact">Contact</Link>
        </nav>
        <Link className="rp-login" href="/espace">ESPACE CONNECTÉ</Link>
      </header>

      <section className="rp-white" style={{ padding: "60px 5vw 70px" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <Link href="/offres" className="rp-text-link" style={{ color: "#f97316", fontSize: "10px", fontWeight: 800 }}>← RETOUR AUX OFFRES</Link>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "28px" }}>
            <div className="rp-eyebrow">OFFRE OUVERTE</div>
            {frenchTranslation.isAutoTranslated && (
              <span style={{ border: "1px solid #f97316", padding: "2px 8px", fontSize: "9px", color: "#f97316", textTransform: "uppercase", fontWeight: 700 }}>
                TRADUCTION AUTOMATIQUE FR (Langue source: {frenchTranslation.sourceLanguage.toUpperCase()})
              </span>
            )}
          </div>

          <h1 style={{ fontSize: "42px", lineHeight: 1.08, margin: "8px 0 14px" }}>{displayTitle}</h1>

          {/* Show original title if auto-translated */}
          {frenchTranslation.isAutoTranslated && frenchTranslation.title !== job.title && (
            <p style={{ fontSize: "12px", color: "#667085", marginTop: "-6px", marginBottom: "16px", fontStyle: "italic" }}>
              Titre original ({frenchTranslation.sourceLanguage.toUpperCase()}) : {job.title}
            </p>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", fontSize: "10px", color: "#667085", marginBottom: "30px" }}>
            <strong style={{ color: "#101827" }}>{job.company.name}</strong>
            {job.location && <span>⌖ {job.location}</span>}
            <span>Publiée le {job.createdAt.toLocaleDateString("fr-FR")}</span>
          </div>

          <div className="rp-card" style={{ padding: "28px", marginBottom: "24px" }}>
            <h2 style={{ fontSize: "18px", margin: "0 0 14px" }}>Description du poste</h2>
            <p style={{ fontSize: "11px", lineHeight: 1.8, color: "#4b5565", whiteSpace: "pre-wrap", margin: 0 }}>
              {displayDescription || "Cette offre ne contient pas encore de description détaillée."}
            </p>
          </div>

          {/* Collapsible/original text section if auto-translated */}
          {frenchTranslation.isAutoTranslated && job.description && (
            <details className="rp-card" style={{ padding: "20px 28px", marginBottom: "24px", background: "#f8fafc" }}>
              <summary style={{ cursor: "pointer", fontSize: "11px", fontWeight: 700, color: "#4b5565" }}>
                Voir le texte d&apos;origine en {frenchTranslation.sourceLanguage.toUpperCase()}
              </summary>
              <p style={{ fontSize: "11px", lineHeight: 1.8, color: "#667085", whiteSpace: "pre-wrap", marginTop: "12px", marginBottom: 0 }}>
                {job.description}
              </p>
            </details>
          )}

          {job.company.description && (
            <div className="rp-card" style={{ padding: "28px", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "18px", margin: "0 0 14px" }}>À propos de l&apos;entreprise</h2>
              <p style={{ fontSize: "11px", lineHeight: 1.8, color: "#4b5565", margin: 0 }}>{job.company.description}</p>
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
            <Link className="rp-btn" href={`/espace/candidat?jobId=${job.id}`}>POSTULER À CETTE OFFRE →</Link>
            <Link className="rp-btn rp-btn-light" href="/offres">TOUTES LES OFFRES</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
