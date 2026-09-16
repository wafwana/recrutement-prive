import React from "react";
import LanguageSelector from "./components/LanguageSelector";

const images = {
  hero: "https://images.unsplash.com/photo-1758518729466-827cd8293992?auto=format&fit=crop&fm=jpg&q=88&w=2200",
  talents: "https://images.unsplash.com/photo-1770992225308-154250075727?auto=format&fit=crop&fm=jpg&q=88&w=1400",
  enterprise: "https://images.unsplash.com/photo-1521790797524-b2497295b8a0?auto=format&fit=crop&fm=jpg&q=88&w=1400",
  intelligence: "https://images.unsplash.com/photo-1677442135136-760c813028c0?auto=format&fit=crop&fm=jpg&q=88&w=1400",
  confidence: "https://images.unsplash.com/photo-1758518729466-827cd8293992?auto=format&fit=crop&fm=jpg&q=88&w=1400",
};

const nav = [
  ["Accueil", "#accueil"],
  ["Le Cabinet", "#cabinet"],
  ["Entreprises", "#entreprises"],
  ["Candidats", "#candidats"],
  ["Notre technologie", "#technologie"],
  ["Contact", "#contact"],
];

const reasons = [
  ["⌯", "MATCHING PAR COMPÉTENCES", "Compétences démontrées et transférables, potentiel et besoins réels - au-delà du CV."],
  ["▣", "PROJECT-TO-PROJECT", "Talent on Demand pour une mission ou un projet de courte, moyenne ou longue durée."],
  ["♙", "LONG-TERM TALENT", "Des talents capables de rejoindre durablement votre organisation et d’évoluer avec elle."],
  ["◎", "TALENTS SANS FRONTIÈRES", "Mobilité virtuelle et collaboration transfrontalière, localement ou à l’international."],
];

const assurances = [
  ["IA EXPLICABLE", "Des recommandations compréhensibles"],
  ["VALIDATION HUMAINE", "La technologie éclaire, l’humain décide"],
  ["PROFILS CONFIDENTIELS", "Données et identités protégées"],
  ["MATCHING INTERNATIONAL", "Belgique, France, Europe et monde"],
];

const featureCards = [
  ["TALENTS", images.talents, "Votre parcours ne vous limite pas.", "Faites reconnaître vos compétences, votre potentiel et vos ambitions.", "CRÉER MON PROFIL →", "#candidats"],
  ["ENTREPRISES", images.enterprise, "Vos prochaines pépites sont peut-être déjà disponibles.", "Trouvez les compétences adaptées à un poste, une mission ou un projet.", "DÉCRIRE MON BESOIN →", "#entreprises"],
  ["NOTRE INTELLIGENCE", images.intelligence, "L’IA recommande. L’humain décide.", "Chaque correspondance révèle les forces, les écarts et le potentiel d’évolution.", "DÉCOUVRIR LE MATCHING →", "#technologie"],
  ["CONFIANCE", images.confidence, "Des rencontres professionnelles sécurisées.", "Profils vérifiés, données protégées et mise en relation encadrée.", "NOS ENGAGEMENTS →", "#contact"],
];

const testimonials = [
  ["Marc D.", "Directeur des Ressources Humaines", "Grâce à Recrutement Privé, nous avons trouvé des profils de qualité en un temps record. Une équipe professionnelle et à l’écoute."],
  ["Sophie L.", "Directrice Générale", "Un cabinet qui allie parfaitement performance et humanité. Merci pour votre engagement à nos côtés."],
  ["Jean B.", "Responsable Talent Acquisition", "Leur expertise en recrutement et en formation fait vraiment la différence. Un partenaire de confiance."],
];

function ArrowButton({ children, href, outline = false }: { children: React.ReactNode; href: string; outline?: boolean }) {
  return <a className={`rp-btn ${outline ? "rp-btn-outline" : ""}`} href={href}>{children}</a>;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <div className="rp-heading"><span className="rp-heading-line" />{children}</div>;
}

export default function HomePage() {
  return (
    <main className="rp-home">
      <header className="rp-header">
        <a href="#accueil" className="rp-brand" aria-label="Recrutement Privé - accueil">
          <span className="rp-logo">RP</span>
          <span className="rp-brand-copy"><strong>RECRUTEMENT PRIVÉ</strong><small>EXPERT RECRUTEMENT</small></span>
        </a>
        <nav className="rp-nav" aria-label="Navigation principale">
          {nav.map(([label, href], index) => <a key={label} href={href} className={index === 0 ? "active" : ""}>{label}</a>)}
        </nav>
        <div className="rp-header-actions">
          <LanguageSelector />
          <a className="rp-login" href="/espace"><span aria-hidden="true">●</span> Espace connecté</a>
        </div>
      </header>

      <section id="accueil" className="rp-hero">
        <div className="rp-hero-copy">
          <h1>Votre partenaire en<br />recrutement et<br /><span>développement des talents</span></h1>
          <p>Nous connectons les entreprises aux meilleurs profils<br className="desktop-only" /> et accompagnons les candidats vers l’emploi.</p>
          <div className="rp-actions">
            <ArrowButton href="#candidats">▣ &nbsp; DÉPOSER UN CV &nbsp; →</ArrowButton>
            <ArrowButton href="#entreprises" outline>● &nbsp; RECRUTER &nbsp; →</ArrowButton>
          </div>
        </div>
        <div className="rp-hero-image" role="img" aria-label="Professionnelle du recrutement" style={{ backgroundImage: `url(${images.hero})` }} />
      </section>

      <section className="rp-reasons">
        <SectionHeading><h2>POURQUOI <span>nous choisir</span> ?</h2></SectionHeading>
        <div className="rp-reason-grid">
          {reasons.map(([icon, title, text]) => (
            <article className="rp-reason" key={title}>
              <div className="rp-reason-icon" aria-hidden="true">{icon}</div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rp-assurances" aria-label="Nos engagements">
        {assurances.map(([title, text]) => (
          <div className="rp-assurance" key={title}>
            <span className="rp-assurance-ring" aria-hidden="true" />
            <div><strong>{title}</strong><small>{text}</small></div>
          </div>
        ))}
      </section>

      <section className="rp-feature-grid" aria-label="Talents, entreprises, intelligence et confiance">
        {featureCards.map(([eyebrow, image, title, text, cta, href]) => (
          <article className="rp-feature" key={eyebrow}>
            <div className="rp-feature-image" style={{ backgroundImage: `url(${image})` }} role="img" aria-label={eyebrow} />
            <div className="rp-feature-body">
              <span className="rp-feature-eyebrow">{eyebrow}</span>
              <h3>{title}</h3>
              <p>{text}</p>
              <a href={href}>{cta}</a>
            </div>
          </article>
        ))}
      </section>

      <section className="rp-numbers">
        <SectionHeading><h2>EN QUELQUES CHIFFRES</h2></SectionHeading>
        <div className="rp-number-grid">
          {[["♟", "+850", "Candidats accompagnés"], ["▤", "120+", "Entreprises partenaires"], ["▣", "350+", "Recrutements réalisés"], ["◆", "200+", "Formations dispensées"]].map(([icon, value, label]) => (
            <div className="rp-number" key={label}><span className="rp-number-icon">{icon}</span><strong>{value}</strong><small>{label}</small></div>
          ))}
        </div>
      </section>

      <section className="rp-trust">
        <SectionHeading><h2>ILS NOUS FONT CONFIANCE</h2></SectionHeading>
        <div className="rp-testimonial-grid">
          {testimonials.map(([name, role, quote], index) => (
            <article className="rp-testimonial" key={name}>
              <span className="rp-quote-mark">“</span>
              <p>{quote}</p>
              <div className="rp-person"><span className="rp-avatar">{index === 1 ? "SL" : index === 2 ? "JB" : "MD"}</span><div><strong>{name}</strong><small>{role}</small></div></div>
            </article>
          ))}
        </div>
        <div className="rp-dots" aria-hidden="true"><span className="selected" /><span /><span /></div>
      </section>

      <section className="rp-final-cta">
        <div className="rp-final-icon" aria-hidden="true">●●●</div>
        <div><strong>Vous recrutez ou vous recherchez un emploi ?</strong><span>Contactez-nous dès aujourd’hui.</span></div>
        <ArrowButton href="#contact" outline>NOUS CONTACTER &nbsp; →</ArrowButton>
      </section>

      <footer className="rp-footer">
        <div className="rp-footer-brand">
          <a href="#accueil" className="rp-brand"><span className="rp-logo">RP</span><span className="rp-brand-copy"><strong>RECRUTEMENT PRIVÉ</strong><small>EXPERT RECRUTEMENT</small></span></a>
          <p>Des talents d’aujourd’hui<br />pour les réussites de demain.</p>
          <div className="rp-socials"><span>in</span><span>𝕏</span><span>◎</span><span>▶</span></div>
        </div>
        <div><h3>Navigation</h3>{nav.map(([label, href]) => <a key={label} href={href}>{label}</a>)}</div>
        <div><h3>Liens utiles</h3><a href="/offres">Offres d’emploi</a><a href="#candidats">Formation</a><a href="/espace/entreprise">Espace entreprise</a><a href="/espace">Espace candidat</a><a href="/mentions-legales">Mentions légales</a><a href="/politique-confidentialite">Politique de confidentialité</a><a href="#accueil">Plan du site</a></div>
        <div><h3>Contact</h3><a href="tel:+33612345678">☎ &nbsp; +33 6 12 34 56 78</a><a href="mailto:contact@recrutement-prive.com">✉ &nbsp; contact@recrutement-prive.com</a><span>⌖ &nbsp; Paris, France</span></div>
        <div className="rp-copyright">© 2026 Recrutement Privé. Tous droits réservés.</div>
      </footer>
    </main>
  );
}
