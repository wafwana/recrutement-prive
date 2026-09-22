"use client";

import React from "react";
import LanguageSelector from "./components/LanguageSelector";
import { useI18n } from "@/lib/i18n/context";

const images = {
  hero: "/visuals/hero-final.webp?v=hero-final-20260917",
  talents: "https://images.unsplash.com/photo-1770992225308-154250075727?auto=format&fit=crop&fm=jpg&q=88&w=1400",
  enterprise: "https://images.unsplash.com/photo-1521790797524-b2497295b8a0?auto=format&fit=crop&fm=jpg&q=88&w=1400",
  intelligence: "https://images.unsplash.com/photo-1677442135136-760c813028c0?auto=format&fit=crop&fm=jpg&q=88&w=1400",
  confidence: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&fm=jpg&q=88&w=1400",
};

const nav = [["nav_home", "#accueil"], ["nav_cabinet", "#cabinet"], ["nav_enterprises", "#entreprises"], ["nav_candidates", "#candidats"], ["nav_tech", "#technologie"], ["nav_contact", "#contact"]] as const;
const reasons = [["⌯", "reason_matching_title", "reason_matching_text"], ["▣", "reason_project_title", "reason_project_text"], ["♙", "reason_longterm_title", "reason_longterm_text"], ["◎", "reason_global_title", "reason_global_text"]] as const;
const assurances = [["assurance_ai_title", "assurance_ai_text"], ["assurance_human_title", "assurance_human_text"], ["assurance_private_title", "assurance_private_text"], ["assurance_global_title", "assurance_global_text"]] as const;
const featureCards = [["feature_talents_eyebrow", images.talents, "feature_talents_title", "feature_talents_text", "feature_talents_cta", "#candidats"], ["feature_enterprise_eyebrow", images.enterprise, "feature_enterprise_title", "feature_enterprise_text", "feature_enterprise_cta", "#entreprises"], ["feature_ai_eyebrow", images.intelligence, "feature_ai_title", "feature_ai_text", "feature_ai_cta", "#technologie"], ["feature_confidence_eyebrow", images.confidence, "feature_confidence_title", "feature_confidence_text", "feature_confidence_cta", "#contact"]] as const;
const testimonials = [["testimonial_1_name", "testimonial_1_role", "testimonial_1_quote", "MD"], ["testimonial_2_name", "testimonial_2_role", "testimonial_2_quote", "SL"], ["testimonial_3_name", "testimonial_3_role", "testimonial_3_quote", "JB"]] as const;

function ArrowButton({ children, href, outline = false }: { children: React.ReactNode; href: string; outline?: boolean }) {
  return <a className={`rp-btn ${outline ? "rp-btn-outline" : ""}`} href={href}>{children}</a>;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <div className="rp-heading"><span className="rp-heading-line" />{children}</div>;
}

export default function HomePage() {
  const { t } = useI18n();
  const publicSectorCards = [
    {
      code: "INDUSTRIE",
      name: "Industrie",
      jobs: ["Direction production", "Direction maintenance", "Direction qualité / QHSE", "Direction méthodes / industrialisation", "Direction supply chain industrielle"],
    },
    {
      code: "LOGISTIQUE",
      name: "Logistique & Supply Chain",
      jobs: ["Direction logistique / transport", "Direction achats", "Direction supply chain", "Direction planification / ordonnancement", "Direction entrepôt / warehouse"],
    },
    {
      code: "COMMERCE",
      name: "Commerce & Business",
      jobs: ["Direction ventes B2B", "Direction grands comptes / Key Account", "Direction business development", "Direction commerciale", "Direction retail / réseau"],
    },
    {
      code: "AGROALIMENTAIRE",
      name: "Agro-alimentaire",
      jobs: ["Direction production / transformation", "Direction qualité / sécurité alimentaire", "Direction R&D / innovation", "Direction supply chain / approvisionnement", "Direction industrielle"],
    },
    {
      code: "IT",
      name: "Informatique & Tech",
      jobs: ["Direction développement logiciel", "Direction Data / IA", "Direction cybersécurité", "Direction Cloud / DevOps / SRE", "Direction robotique / IoT"],
    },
    {
      code: "AGRICULTURE",
      name: "Agriculture",
      jobs: ["Direction production agricole", "Direction agronomie / conseil", "Direction agroéquipements", "Direction supply chain / distribution", "Direction d'exploitation"],
    },
  ] as const;

  return <main className="rp-home">
    <header className="rp-header">
      <a href="#accueil" className="rp-brand" aria-label="Recrutement Privé - accueil"><span className="rp-logo">RP</span><span className="rp-brand-copy"><strong>RECRUTEMENT PRIVÉ</strong><small>EXPERT RECRUTEMENT</small></span></a>
      <nav className="rp-nav" aria-label="Navigation principale">{nav.map(([key, href], index) => <a key={key} href={href} className={index === 0 ? "active" : ""}>{t(key)}</a>)}</nav>
      <div className="rp-header-actions"><LanguageSelector /><a className="rp-login" href="/espace"><span aria-hidden="true">●</span> {t("nav_connected_space")}</a></div>
    </header>

    <section id="accueil" className="rp-hero">
      <div className="rp-hero-copy">
        <div className="rp-hero-kicker">{t("hero_kicker")}</div>
        <h1>Le recrutement d'excellence,<br />guidé par l'humain et renforcé<br /><span>par l'intelligence artificielle.</span></h1>
        <p>Nous connectons les entreprises aux meilleurs profils et accompagnons<br className="desktop-only" /> les candidats vers le succès.</p>
        <p className="rp-hero-privacy">Recrutement Privé ne vend pas les coordonnées des candidats,<br />Recrutement Privé organise des mises en relation qualifiées, après<br />validation de l'intéret de l'entreprise et du candidat.</p>
        <div className="rp-actions"><ArrowButton href="#candidats">▣ &nbsp; {t("hero_cv_btn")} &nbsp; →</ArrowButton><ArrowButton href="#entreprises" outline>● &nbsp; {t("hero_recruit_btn")} &nbsp; →</ArrowButton></div>
        <div className="rp-hero-values" aria-label="Engagements clés">
          <div><strong>☆</strong><span><b>Expertise</b><small>métiers et secteurs</small></span></div>
          <div><strong>♧</strong><span><b>Accompagnement</b><small>sur-mesure</small></span></div>
          <div><strong>⌁</strong><span><b>Résultats</b><small>durables</small></span></div>
        </div>
      </div>
      <div className="rp-hero-image" role="img" aria-label={t("hero_image_alt")} style={{ backgroundImage: `url(${images.hero})` }} />
    </section>

    <section id="secteurs" className="mx-auto w-[min(1180px,calc(100%-40px))] py-16 md:w-[min(1180px,calc(100%-72px))] md:py-20">
      <SectionHeading><h2>Secteurs d’activité <span>&amp; métiers</span></h2></SectionHeading>
      <p className="mx-auto mt-4 max-w-3xl text-center text-sm leading-7 text-white/50">Aperçu public des principaux secteurs. L’accès aux métiers, sous-métiers et fonctionnalités complètes est réservé aux utilisateurs inscrits.</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {publicSectorCards.map((sector) => (
          <article key={sector.code} className="border border-white/10 bg-[#111] p-6 transition hover:border-[#F97316]/50">
            <h3 className="font-serif text-xl text-white">{sector.name}</h3>
            <div className="mt-2 text-[9px] uppercase tracking-[0.18em] text-[#F97316]/80">Recherche de cadres supérieurs &amp; profils rares</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {sector.jobs.map((job) => (
                <span key={job} className="border border-white/10 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.08em] text-white/50">
                  {job}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
      <div className="mt-8 text-center">
        <a href="/inscription" className="inline-flex border border-[#F97316] px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-[#F97316]">S’inscrire pour accéder à tous les secteurs &amp; métiers →</a>
      </div>
    </section>
    <section className="rp-reasons"><SectionHeading><h2>{t("why_prefix")} <span>{t("why_emphasis")}</span> ?</h2></SectionHeading><div className="rp-reason-grid">{reasons.map(([icon, titleKey, textKey]) => <article className="rp-reason" key={titleKey}><div className="rp-reason-icon" aria-hidden="true">{icon}</div><h3>{t(titleKey)}</h3><p>{t(textKey)}</p></article>)}</div></section>
    <section className="rp-assurances" aria-label={t("assurances_label")}>{assurances.map(([titleKey, textKey]) => <div className="rp-assurance" key={titleKey}><span className="rp-assurance-ring" aria-hidden="true" /><div><strong>{t(titleKey)}</strong><small>{t(textKey)}</small></div></div>)}</section>
    <section className="rp-feature-grid" aria-label={t("features_label")}>{featureCards.map(([eyebrowKey, image, titleKey, textKey, ctaKey, href]) => <article className="rp-feature" key={eyebrowKey}><div className="rp-feature-image" style={{ backgroundImage: `url(${image})` }} role="img" aria-label={t(eyebrowKey)} /><div className="rp-feature-body"><span className="rp-feature-eyebrow">{t(eyebrowKey)}</span><h3>{t(titleKey)}</h3><p>{t(textKey)}</p><a href={href}>{t(ctaKey)}</a></div></article>)}</section>
    <section className="rp-numbers"><SectionHeading><h2>{t("numbers_title")}</h2></SectionHeading><div className="rp-number-grid">{[["♟", "+850", "numbers_candidates"], ["▤", "120+", "numbers_companies"], ["▣", "350+", "numbers_recruitments"], ["◆", "200+", "numbers_training"]].map(([icon, value, labelKey]) => <div className="rp-number" key={labelKey}><span className="rp-number-icon">{icon}</span><strong>{value}</strong><small>{t(labelKey)}</small></div>)}</div></section>
    <section className="rp-trust"><SectionHeading><h2>{t("testimonials_title")}</h2></SectionHeading><div className="rp-testimonial-grid">{testimonials.map(([nameKey, roleKey, quoteKey, initials], index) => <article className="rp-testimonial" key={nameKey}><span className="rp-quote-mark">“</span><p>{t(quoteKey)}</p><div className="rp-person"><span className="rp-avatar">{index === 1 ? "SL" : index === 2 ? "JB" : initials}</span><div><strong>{t(nameKey)}</strong><small>{t(roleKey)}</small></div></div></article>)}</div><div className="rp-dots" aria-hidden="true"><span className="selected" /><span /><span /></div></section>
    <section className="rp-final-cta"><div className="rp-final-icon" aria-hidden="true">●●●</div><div><strong>{t("final_cta_title")}</strong><span>{t("final_cta_text")}</span></div><ArrowButton href="#contact" outline>{t("final_cta_button")} &nbsp; →</ArrowButton></section>
    <footer className="rp-footer"><div className="rp-footer-brand"><a href="#accueil" className="rp-brand"><span className="rp-logo">RP</span><span className="rp-brand-copy"><strong>RECRUTEMENT PRIVÉ</strong><small>EXPERT RECRUTEMENT</small></span></a><p>{t("footer_tagline_line_1")}<br />{t("footer_tagline_line_2")}</p><div className="rp-socials"><span>in</span><span>𝕏</span><span>◎</span><span>▶</span></div></div><div><h3>{t("footer_navigation")}</h3>{nav.map(([key, href]) => <a key={key} href={href}>{t(key)}</a>)}</div><div><h3>{t("footer_useful_links")}</h3><a href="/offres">{t("footer_jobs")}</a><a href="#candidats">{t("footer_training")}</a><a href="/espace/entreprise">{t("footer_company_space")}</a><a href="/espace">{t("footer_candidate_space")}</a><a href="/mentions-legales">{t("footer_legal")}</a><a href="/politique-confidentialite">{t("footer_privacy")}</a><a href="#accueil">{t("footer_sitemap")}</a></div><div id="contact"><h3>{t("footer_contact")}</h3><a href="mailto:contact@recrutement-prive.com">✉ &nbsp; contact@recrutement-prive.com</a><span>⌖ &nbsp; Saint-Amand-les-Eaux, France</span></div><div className="rp-copyright">© 2026 Recrutement Privé. {t("footer_rights")}</div></footer>
  </main>;
}
