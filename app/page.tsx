import React, { Suspense } from "react";
import CandidateCvForm from "./components/CandidateCvForm";
import LanguageSelector from "./components/LanguageSelector";

const images = {
  hero: "/visuals/hero-portrait.jpeg",
  cabinet: "/visuals/cabinet-office.jpeg",
  enterprise: "/visuals/enterprise-handshake.jpeg",
  tech: "/visuals/ai-human.jpeg",
};

const services = [
  ["◉", "Recrutement", "Nous diffusons les meilleures offres pour répondre à vos besoins."],
  ["◆", "Formation professionnelle", "Nous développons les compétences pour améliorer les performances et la croissance."],
  ["◇", "Accompagnement RH", "Nous accompagnons les entreprises dans la gestion et le développement de leurs talents."],
  ["↗", "Conseil en gestion des talents", "Nous aidons à élaborer des stratégies efficaces pour attirer, fidéliser et valoriser vos talents."],
];
const stats = [["+850","Candidats accompagnés"],["+350","Entreprises partenaires"],["+30","Ans d'expérience"],["98%","De satisfaction client"]];

function Button({ children, href = "#contact", light = false }: { children: React.ReactNode; href?: string; light?: boolean }) {
  return <a className={`rp-btn ${light ? "rp-btn-light" : ""}`} href={href}>{children}</a>;
}
function SectionTitle({ eyebrow, title, children }: { eyebrow?: string; title: React.ReactNode; children?: React.ReactNode }) {
  return <div className="rp-section-title">{eyebrow && <div className="rp-eyebrow">{eyebrow}</div>}<h2>{title}</h2>{children}</div>;
}
function Card({ icon, title, text }: { icon: string; title: string; text: string }) {
  return <article className="rp-card"><div className="rp-icon" aria-hidden="true">{icon}</div><h3>{title}</h3><p>{text}</p></article>;
}

const quickNav = [
  ["Accueil", "#accueil"], ["Le Cabinet", "#cabinet"], ["Entreprises", "#entreprises"],
  ["Candidats", "#candidats"], ["Notre technologie", "#technologie"], ["Contact", "#contact"],
];

export default function HomePage() {
  return <main className="rp-site">
    <header className="rp-header">
      <a href="#accueil" className="rp-brand" aria-label="Recrutement Privé - accueil"><span className="rp-logo">RP</span><span><strong>RECRUTEMENT PRIVÉ</strong><small>EXPERT RECRUTEMENT</small></span></a>
      <nav className="rp-nav" aria-label="Navigation principale">{quickNav.map(([label,href],i)=><a key={label} className={i===0?"active":""} href={href}>{label}</a>)}</nav>
      <div className="flex items-center gap-3">
        <Suspense fallback={<div className="text-xs text-slate-400">Langue...</div>}>
          <LanguageSelector />
        </Suspense>
        <a className="rp-login" href="/espace">ESPACE CONNECTÉ</a>
      </div>
    </header>

    <section id="accueil" className="rp-hero">
      <div className="rp-hero-copy"><div className="rp-eyebrow">CABINET DE RECRUTEMENT</div><h1>Le recrutement d’excellence,<br/><span>guidé par l’humain</span><br/>et renforcé par<br/><span>l’intelligence artificielle.</span></h1><p>Nous connectons les entreprises aux meilleurs profils et accompagnons les candidats vers le succès.</p><p className="mt-4 max-w-2xl text-sm leading-7">Recrutement Privé ne vend pas les coordonnées des candidats. Recrutement Privé organise des mises en relation qualifiées, après validation de l'intérêt de l'entreprise et du candidat.</p><div className="rp-actions"><Button href="#candidats">↥ DÉPOSER UN CV</Button><Button href="#entreprises" light>♟ RECRUTER</Button></div></div>
      <div className="rp-hero-image" role="img" aria-label="Consultant Recrutement Privé" style={{backgroundImage:`url(${images.hero})`}}/>
    </section>

    <section className="rp-white rp-services"><SectionTitle title="Nos services"/><div className="rp-grid-4">{services.map(([icon,title,text])=><Card key={title} icon={icon} title={title} text={text}/>)}</div></section>
    <section className="rp-stats" aria-label="Chiffres clés">{stats.map(([value,label])=><div className="rp-stat" key={label}><strong>{value}</strong><span>{label}</span></div>)}</section>

    <section className="rp-white rp-testimonials"><SectionTitle title="Ils nous font confiance"/><div className="rp-grid-3">{[["Sarah D.","Directrice des Ressources Humaines","Grâce à Recrutement Privé, nous avons trouvé des profils de qualité en un temps record. Une équipe professionnelle et à l'écoute."],["Mariam K.","Responsable recrutement","Un travail de qualité qui comprend parfaitement nos enjeux. Merci pour votre accompagnement et votre réactivité."],["Julien G.","Responsable Talent Acquisition","Leur expertise en recrutement et en évaluation des talents fait vraiment la différence. Je recommande !"]].map(([name,role,quote])=><article className="rp-quote" key={name}><span className="quote-mark" aria-hidden="true">“</span><p>{quote}</p><strong>{name}</strong><small>{role}</small></article>)}</div></section>
    <section className="rp-cta"><div><strong>Vous recrutez ou recherchez un emploi ?</strong><span>Contactez-nous dès aujourd'hui.</span></div><Button>NOUS CONTACTER →</Button></section>

    <section id="cabinet" className="rp-white rp-split"><div><SectionTitle eyebrow="LE CABINET" title={<>Recrutement Privé,<br/><span>plus de 6 ans</span> à vos côtés</>}><p>Fort de plus de 30 ans d'expérience dans le recrutement et les ressources humaines, nous mettons notre expertise au service de votre réussite.</p></SectionTitle></div><div className="rp-photo" role="img" aria-label="Bureau Recrutement Privé" style={{backgroundImage:`url(${images.cabinet})`}}/></section>
    <section className="rp-white rp-approach"><div className="rp-mini-stats">{[["+6","Années d'existence"],["+30","Ans d'expérience"],["+850","Recrutements réalisés"],["+350","Entreprises partenaires"]].map(([v,l])=><div key={l}><strong>{v}</strong><span>{l}</span></div>)}</div><div className="rp-approach-grid"><SectionTitle title="Notre approche"><p>Nous combinons expertise humaine et technologie pour offrir des solutions sur-mesure à chaque besoin.</p></SectionTitle><ul>{["Écoute et compréhension","Analyse précise des besoins","Sélection rigoureuse des talents","Suivi et accompagnement personnalisé"].map(x=><li key={x}>✓ {x}</li>)}</ul></div><SectionTitle title="Nos valeurs"/><div className="rp-grid-4">{["Intégrité","Excellence","Engagement","Confiance"].map((x,i)=><Card key={x} icon={["◉","✦","♙","▣"][i]} title={x} text="Nous plaçons cette valeur au cœur de notre relation et de nos décisions."/>)}</div><div className="rp-section-cta"><Button>NOUS CONTACTER →</Button></div></section>

    <section id="entreprises" className="rp-white rp-enterprises"><div className="rp-enterprise-image rp-photo" role="img" aria-label="Partenariat entreprise" style={{backgroundImage:`url(${images.enterprise})`}}/><div className="rp-enterprise-copy"><SectionTitle eyebrow="ENTREPRISES" title={<>Trouvez les <span>talents</span><br/>qui feront la différence</>}><p>Nous vous accompagnons dans toutes vos étapes de recrutement pour vous faire gagner du temps et mieux recruter.</p></SectionTitle><div className="rp-actions"><Button href="/espace/entreprise">DÉPOSER UNE OFFRE</Button><a className="rp-text-link" href="#contact">Nous contacter →</a></div></div></section>
    <section className="rp-white rp-solutions"><SectionTitle title="Nos solutions pour les entreprises"/><div className="rp-grid-4">{[["▣","Recrutement sur-mesure","Nous identifions les meilleurs profils adaptés à vos besoins."],["◷","Gain de temps","Nous gérons l'ensemble du processus pour vous."],["♙","Qualité garantie","Des candidats rigoureusement sélectionnés et évalués."],["♧","Accompagnement","Un suivi personnalisé avant, pendant et après le recrutement."]].map(([i,t,d])=><Card key={t} icon={i} title={t} text={d}/>)}</div><div className="rp-sectors"><h3>Secteurs d'activité</h3><div>{["Industrie","Logistique","Commerce","Service","Informatique","BTP"].map(x=><span key={x}>▦<b>{x}</b></span>)}</div><a href="/offres">VOIR NOS OFFRES →</a></div></section>

    <section id="technologie" className="rp-white rp-tech"><div className="rp-tech-copy"><SectionTitle eyebrow="NOTRE TECHNOLOGIE" title={<>L'IA au service de <span>l'humain</span></>}><p>Notre IA transforme l'information en insights pertinents pour faciliter nos recherches et mieux servir entreprises et talents.</p></SectionTitle></div><div className="rp-tech-image rp-photo" role="img" aria-label="Technologie IA" style={{backgroundImage:`url(${images.tech})`}}/><div className="rp-tech-list">{["Analyse intelligente","Matching précis","Gain de temps","Décision humaine"].map((x,i)=><Card key={x} icon={["◈","♢","◷","◉"][i]} title={x} text="Des outils avancés au service d'un recrutement plus précis et plus humain."/>)}</div></section>

    <section id="candidats" className="rp-white rp-candidates"><SectionTitle eyebrow="CANDIDATS" title="Une opportunité à la hauteur de votre parcours"><p>Faites-nous connaître votre projet professionnel. Nous vous accompagnons avec confidentialité.</p></SectionTitle><CandidateCvForm /></section>
    <section id="contact" className="rp-white rp-contact"><div><SectionTitle eyebrow="CONTACT" title="Contactez-nous"><p>Nous sommes à votre écoute du lundi au vendredi.</p></SectionTitle><div className="rp-contact-details"><b>✉ Email</b><a href="mailto:contact@recrutement-prive.com">contact@recrutement-prive.com</a><b>⌖ Adresse</b><span>Saint-Amand-les-Eaux</span><b>⌚ Horaires</b><span>Lundi - Vendredi · 9h00 - 18h00</span></div></div><form className="rp-form" action="/api/contact" method="post"><label className="sr-only" htmlFor="contact-name">Nom complet</label><input id="contact-name" name="name" placeholder="Nom complet*" required/><label className="sr-only" htmlFor="contact-email">Email</label><input id="contact-email" name="email" type="email" placeholder="Email*" required/><label className="sr-only" htmlFor="contact-phone">Téléphone</label><input id="contact-phone" name="phone" placeholder="Téléphone"/><label className="sr-only" htmlFor="contact-subject">Sujet</label><select id="contact-subject" name="subject" defaultValue="" required><option value="" disabled>Sujet*</option><option>Recrutement</option><option>Candidature</option><option>Autre</option></select><label className="sr-only" htmlFor="contact-message">Votre message</label><textarea id="contact-message" name="message" placeholder="Votre message*" rows={5} required/><button className="rp-btn" type="submit">ENVOYER LE MESSAGE</button></form><div className="rp-map"><span>● Recrutement Privé<br/><small>Saint-Amand-les-Eaux</small></span></div></section>
    <section className="rp-footer-cta"><div><strong>Envie d'en savoir plus ?</strong><span>Contactez-nous pour échanger sur vos besoins.</span></div><Button>NOUS CONTACTER →</Button></section>
    <footer className="rp-footer"><div className="rp-brand"><span className="rp-logo">RP</span><span><strong>RECRUTEMENT PRIVÉ</strong><small>EXPERT RECRUTEMENT</small></span></div><div><b>NAVIGATION</b>{quickNav.map(([label,href])=><a key={label} href={href}>{label}</a>)}</div><div><b>LIENS UTILES</b><a href="/offres">Offres d'emploi</a><a href="#candidats">Déposer un CV</a><a href="/espace/entreprise">Espace entreprise</a><a href="/mentions-legales">Mentions légales</a></div><div><b>CONTACT</b><a href="mailto:contact@recrutement-prive.com">✉ contact@recrutement-prive.com</a><span>⌖ Saint-Amand-les-Eaux</span></div></footer>
  </main>;
}
