import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OffersPage() {
  let jobs: Array<{
    id: string;
    title: string;
    location: string | null;
    description: string | null;
    createdAt: Date;
    company: { name: string };
  }> = [];

  try {
    jobs = await prisma.job.findMany({
      where: { status: "OPEN" },
      select: {
        id: true,
        title: true,
        location: true,
        description: true,
        createdAt: true,
        company: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    jobs = [];
  }

  return (
    <main className="rp-site min-h-screen">
      <header className="rp-header">
        <Link href="/" className="rp-brand" aria-label="Recrutement Privé - accueil">
          <span className="rp-logo">RP</span>
          <span><strong>RECRUTEMENT PRIVÉ</strong><small>EXPERT RECRUTEMENT</small></span>
        </Link>
        <nav className="rp-nav" aria-label="Navigation principale">
          <Link href="/">Accueil</Link>
          <Link href="/#entreprises">Entreprises</Link>
          <Link href="/#candidats">Candidats</Link>
          <Link href="/#contact">Contact</Link>
        </nav>
        <Link className="rp-login" href="/espace">ESPACE CONNECTÉ</Link>
      </header>

      <section className="rp-white" style={{ padding: "56px 5vw 30px" }}>
        <div className="rp-section-title">
          <div className="rp-eyebrow">OPPORTUNITÉS</div>
          <h1 style={{ fontSize: "38px", margin: "8px 0" }}>Nos <span>offres d'emploi</span></h1>
          <p>Découvrez les postes actuellement ouverts et rejoignez les entreprises que nous accompagnons.</p>
        </div>
      </section>

      <section className="rp-white" style={{ padding: "10px 5vw 70px" }}>
        {jobs.length === 0 ? (
          <div style={{ border: "1px solid #e7e9ed", padding: "34px", textAlign: "center", background: "#f8fafc" }}>
            <h2 style={{ margin: "0 0 10px", fontSize: "20px" }}>Aucune offre ouverte pour le moment</h2>
            <p style={{ margin: "0 0 18px", color: "#667085", fontSize: "12px" }}>Déposez votre profil pour être recontacté dès qu'une opportunité correspond à votre parcours.</p>
            <Link className="rp-btn" href="/espace/candidat">JE SUIS CANDIDAT →</Link>
          </div>
        ) : (
          <div className="rp-grid-3">
            {jobs.map((job) => (
              <article className="rp-card" key={job.id} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div className="rp-eyebrow">OFFRE OUVERTE</div>
                <h2 style={{ fontSize: "18px", margin: 0 }}>{job.title}</h2>
                <strong style={{ fontSize: "10px" }}>{job.company.name}</strong>
                {job.location && <span style={{ fontSize: "9px", color: "#667085" }}>⌖ {job.location}</span>}
                {job.description && <p style={{ fontSize: "9px", lineHeight: 1.6, color: "#667085", margin: "4px 0" }}>{job.description}</p>}
                <div style={{ marginTop: "auto", paddingTop: "10px" }}>
                  <Link className="rp-btn" href={`/offres/${job.id}`}>VOIR L'OFFRE →</Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rp-footer-cta">
        <div><strong>Vous ne trouvez pas votre prochaine opportunité ?</strong><span>Déposez votre profil auprès de notre cabinet.</span></div>
        <Link className="rp-btn" href="/espace/candidat">DÉPOSER UN CV →</Link>
      </section>
    </main>
  );
}
