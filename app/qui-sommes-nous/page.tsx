"use client";

import React from "react";
import LanguageSelector from "../components/LanguageSelector";
import { useI18n } from "@/lib/i18n/context";

function ArrowButton({ children, href, outline = false }: { children: React.ReactNode; href: string; outline?: boolean }) {
  return <a className={`rp-btn ${outline ? "rp-btn-outline" : ""}`} href={href}>{children}</a>;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <div className="rp-heading"><span className="rp-heading-line" />{children}</div>;
}

const nav = [["nav_home", "/"], ["nav_cabinet", "/qui-sommes-nous"], ["nav_enterprises", "/#entreprises"], ["nav_candidates", "/#candidats"], ["nav_tech", "/#technologie"], ["nav_contact", "/#contact"]] as const;

export default function QuiSommesNousPage() {
  const { t } = useI18n();

  return (
    <main className="rp-home">
      <header className="rp-header">
        <a href="/" className="rp-brand" aria-label="Recrutement Privé - accueil"><span className="rp-logo">RP</span><span className="rp-brand-copy"><strong>RECRUTEMENT PRIVÉ</strong><small>EXPERT RECRUTEMENT</small></span></a>
        <nav className="rp-nav" aria-label="Navigation principale">{nav.map(([key, href]) => <a key={key} href={href} className={key === "nav_cabinet" ? "active" : ""}>{t(key)}</a>)}</nav>
        <div className="rp-header-actions"><LanguageSelector /><a className="rp-login" href="/espace"><span aria-hidden="true">●</span> {t("nav_connected_space")}</a></div>
      </header>

      <section className="rp-about" aria-labelledby="cabinet-title">
        <div className="rp-about-intro">
          <SectionHeading><h1 id="cabinet-title">{t("about_eyebrow")}</h1></SectionHeading>
          <h2>{t("about_title")}</h2>
          <p className="rp-about-lead">{t("about_lead")}</p>
        </div>

        <div className="rp-about-grid">
          <article><span>01</span><h3>{t("about_approach_title")}</h3><p>{t("about_approach_text")}</p></article>
          <article><span>02</span><h3>{t("about_search_title")}</h3><p>{t("about_search_text")}</p></article>
          <article><span>03</span><h3>{t("about_confidentiality_title")}</h3><p>{t("about_confidentiality_text")}</p></article>
        </div>

        <div className="rp-about-signature">
          <strong>{t("about_signature_title")}</strong>
          <p>{t("about_signature_text")}</p>
        </div>

        <div className="rp-about-method-intro">
          <SectionHeading><h2>{t("about_method_eyebrow")}</h2></SectionHeading>
          <h3>{t("about_method_title")}</h3>
          <p>{t("about_method_lead")}</p>
        </div>

        <div className="rp-about-method-grid">
          <article><span>01</span><h3>{t("about_why_title")}</h3><p>{t("about_why_text")}</p></article>
          <article><span>02</span><h3>{t("about_search_process_title")}</h3><p>{t("about_search_process_text")}</p></article>
          <article><span>03</span><h3>{t("about_ai_title")}</h3><p>{t("about_ai_text")}</p></article>
          <article><span>04</span><h3>{t("about_human_title")}</h3><p>{t("about_human_text")}</p></article>
          <article><span>05</span><h3>{t("about_security_title")}</h3><p>{t("about_security_text")}</p></article>
          <article><span>06</span><h3>{t("about_result_title")}</h3><p>{t("about_result_text")}</p></article>
        </div>

        <div className="rp-about-team">
          <div className="rp-about-team-copy">
            <span className="rp-about-team-kicker">{t("about_team_eyebrow")}</span>
            <h3>{t("about_team_title")}</h3>
            <p>{t("about_team_text")}</p>
          </div>
          <div className="rp-about-team-grid">
            <article><strong>01</strong><h4>{t("about_team_research_title")}</h4><p>{t("about_team_research_text")}</p></article>
            <article><strong>02</strong><h4>{t("about_team_ai_title")}</h4><p>{t("about_team_ai_text")}</p></article>
            <article><strong>03</strong><h4>{t("about_team_expertise_title")}</h4><p>{t("about_team_expertise_text")}</p></article>
            <article><strong>04</strong><h4>{t("about_team_followup_title")}</h4><p>{t("about_team_followup_text")}</p></article>
          </div>
        </div>

        <div className="rp-about-try">
          <span>{t("about_try_eyebrow")}</span>
          <h3>{t("about_try_title")}</h3>
          <p>{t("about_try_text")}</p>
          <div><ArrowButton href="/#entreprises">{t("about_try_company")}</ArrowButton><ArrowButton href="/#candidats" outline>{t("about_try_candidate")}</ArrowButton></div>
        </div>
      </section>

      <footer className="rp-footer">
        <div className="rp-footer-brand"><a href="/" className="rp-brand"><span className="rp-logo">RP</span><span className="rp-brand-copy"><strong>RECRUTEMENT PRIVÉ</strong><small>EXPERT RECRUTEMENT</small></span></a><p>{t("footer_tagline_line_1")}<br />{t("footer_tagline_line_2")}</p></div>
        <div><h3>{t("footer_navigation")}</h3>{nav.map(([key, href]) => <a key={key} href={href}>{t(key)}</a>)}</div>
        <div id="contact"><h3>{t("footer_contact")}</h3><a href="mailto:contact@recrutement-prive.com">✉ &nbsp; contact@recrutement-prive.com</a><span>⌖ &nbsp; Saint-Amand-les-Eaux, France</span></div>
        <div className="rp-copyright">© 2026 Recrutement Privé. {t("footer_rights")}</div>
      </footer>
    </main>
  );
}
