import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ jobId: string }> };

export default async function JobOfferPage({ params }: Props) {
  const { jobId } = await params;
  let job: {
    id: string;
    title: string;
    location: string | null;
    description: string | null;
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
        createdAt: true,
        company: { select: { name: true, description: true, website: true } },
      },
    });
  } catch {
    notFound();
  }

  if (!job) notFound();

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
          <div className="rp-eyebrow" style={{ marginTop: "28px" }}>OFFRE OUVERTE</div>
          <h1 style={{ fontSize: "42px", lineHeight: 1.08, margin: "8px 0 14px" }}>{job.title}</h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", fontSize: "10px", color: "#667085", marginBottom: "30px" }}>
            <strong style={{ color: "#101827" }}>{job.company.name}</strong>
            {job.location && <span>⌖ {job.location}</span>}
            <span>Publiée le {job.createdAt.toLocaleDateString("fr-FR")}</span>
          </div>

          <div className="rp-card" style={{ padding: "28px", marginBottom: "24px" }}>
            <h2 style={{ fontSize: "18px", margin: "0 0 14px" }}>Description du poste</h2>
            <p style={{ fontSize: "11px", lineHeight: 1.8, color: "#4b5565", whiteSpace: "pre-wrap", margin: 0 }}>
              {job.description || "Cette offre ne contient pas encore de description détaillée."}
            </p>
          </div>

          {job.company.description && (
            <div className="rp-card" style={{ padding: "28px", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "18px", margin: "0 0 14px" }}>À propos de l'entreprise</h2>
              <p style={{ fontSize: "11px", lineHeight: 1.8, color: "#4b5565", margin: 0 }}>{job.company.description}</p>
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
            <Link className="rp-btn" href={`/espace/candidat?jobId=${job.id}`}>POSTULER À CETTE OFFRE →</Link>
            <Link className="rp-btn rp-btn-light" href="/">RETOUR AU SITE</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
