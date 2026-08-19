import Link from "next/link";

export default function MaintenancePage() {
  return (
    <main className="maintenance-page">
      <div className="maintenance-shell">
        <div className="maintenance-mark" aria-label="Recrutement Privé">
          RP
        </div>

        <p className="maintenance-eyebrow">RECRUTEMENT PRIVÉ</p>
        <h1>Notre plateforme est en construction.</h1>
        <p className="maintenance-copy">
          Nous finalisons actuellement notre plateforme de recrutement afin de vous
          proposer une expérience complète, fiable et à la hauteur de vos projets.
        </p>

        <div className="maintenance-divider" />

        <p className="maintenance-note">
          Le site sera bientôt disponible. Merci pour votre patience.
        </p>

        <Link className="maintenance-contact" href="mailto:contact@recrutement-prive.com">
          Nous contacter
        </Link>

        <footer>
          © {new Date().getFullYear()} Recrutement Privé · Paris, France
        </footer>
      </div>
    </main>
  );
}
