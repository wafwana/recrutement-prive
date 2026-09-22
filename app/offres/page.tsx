import Link from "next/link";
import { RP_TAXONOMY } from "@/lib/taxonomy/rp-taxonomy";

export const dynamic = "force-static";

const PUBLIC_SECTOR_CODES = ["INDUSTRIE", "LOGISTIQUE", "COMMERCE", "SERVICES", "IT", "BTP"] as const;

export default function OffersPage() {
  const sectors = PUBLIC_SECTOR_CODES
    .map((code) => RP_TAXONOMY.find((sector) => sector.code === code))
    .filter((sector): sector is (typeof RP_TAXONOMY)[number] => Boolean(sector));

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
          <div className="rp-eyebrow">SECTEURS & MÉTIERS</div>
          <h1 style={{ fontSize: "38px", margin: "8px 0" }}>Choisissez votre <span>catégorie</span></h1>
          <p>Les secteurs sont visibles publiquement. Les annonces, CV, profils et mises en relation restent traités par Recrutement Privé et ses utilisateurs accrédités.</p>
        </div>
      </section>

      <section className="rp-white" style={{ padding: "10px 5vw 70px" }}>
        <div className="rp-grid-3">
          {sectors.map((sector) => (
            <article className="rp-card" key={sector.code}>
              <div className="rp-eyebrow">CATÉGORIE</div>
              <h2 style={{ fontSize: "20px", margin: "8px 0 12px" }}>{sector.name.fr}</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {sector.subcategories.slice(0, 6).map((job) => (
                  <span key={job.code} style={{ border: "1px solid #e7e9ed", padding: "6px 8px", fontSize: "9px", color: "#667085" }}>
                    {job.name.fr}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div style={{ marginTop: "34px", border: "1px solid #e7e9ed", padding: "28px", textAlign: "center", background: "#f8fafc" }}>
          <h2 style={{ margin: "0 0 10px", fontSize: "20px" }}>Les annonces et les profils ne sont pas en accès public.</h2>
          <p style={{ margin: "0 auto 18px", maxWidth: "700px", color: "#667085", fontSize: "12px", lineHeight: 1.7 }}>
            Une entreprise dépose son besoin dans la catégorie correspondante. Un candidat dépose son CV dans son ou ses domaines. Recrutement Privé qualifie, sécurise et organise ensuite la mise en relation.
          </p>
          <Link className="rp-btn" href="/inscription">S'INSCRIRE →</Link>
        </div>
      </section>
    </main>
  );
}
