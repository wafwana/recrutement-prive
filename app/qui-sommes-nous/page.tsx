"use client";

import React from "react";
import LanguageSelector from "../components/LanguageSelector";
import { useI18n } from "@/lib/i18n/context";

export default function QuiSommesNousPage() {
  const { t } = useI18n();

  return (
    <main className="rp-home min-h-screen bg-[#0b0b0b] text-white">
      {/* Header */}
      <header className="rp-header">
        <a href="/" className="rp-brand" aria-label="Recrutement Privé - accueil">
          <span className="rp-logo">RP</span>
          <span className="rp-brand-copy">
            <strong>RECRUTEMENT PRIVÉ</strong>
            <small>EXPERT RECRUTEMENT</small>
          </span>
        </a>
        <nav className="rp-nav" aria-label="Navigation principale">
          <a href="/">{t("nav_home") || "Accueil"}</a>
          <a href="/qui-sommes-nous" className="active">
            Qui sommes-nous ?
          </a>
          <a href="/offres">{t("footer_jobs") || "Offres"}</a>
          <a href="/#contact">{t("nav_contact") || "Contact"}</a>
        </nav>
        <div className="rp-header-actions">
          <LanguageSelector />
          <a className="rp-login" href="/espace">
            <span aria-hidden="true">●</span> {t("nav_connected_space") || "Espace connecté"}
          </a>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-12 text-center">
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#c7a15a]">
          Excellence &amp; Confidencialité
        </span>
        <h1 className="mt-4 font-serif text-4xl sm:text-5xl md:text-6xl font-bold leading-tight">
          Qui sommes-nous ?
        </h1>
        <p className="mx-auto mt-6 max-w-3xl text-sm md:text-base leading-8 text-white/70">
          Recrutement Privé est une plateforme SaaS souveraine de chasse de tête et de mise en relation à haute valeur ajoutée. Nous combinons l'expertise humaine de nos consultants à une IA sécurisée et éthique.
        </p>
      </section>

      {/* Main Content Sections */}
      <section className="mx-auto max-w-6xl px-6 py-12 space-y-16">
        {/* Our Mission */}
        <div className="border border-white/10 bg-[#111111] p-8 md:p-12">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#c7a15a]">
            Notre Raison d'Être
          </span>
          <h2 className="mt-3 font-serif text-2xl md:text-3xl">
            Protéger l'identité, valoriser les compétences, réussir chaque recrutement
          </h2>
          <p className="mt-4 text-sm leading-7 text-white/70">
            Contrairement aux plateformes d'intérim ou aux jobboards ouverts, Recrutement Privé ne vend pas et ne divulgue jamais les coordonnées des candidats. Chaque mise en relation est précédée d'une qualification rigoureuse et d'un accord réciproque explicite entre le candidat et l'entreprise.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid gap-8 md:grid-cols-3">
          {/* Candidates */}
          <div className="border border-white/10 bg-[#111111] p-6">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c7a15a]">
              Pour les Candidats
            </span>
            <h3 className="mt-2 font-serif text-xl">Confidentialité &amp; Opportunités Sur-Mesure</h3>
            <p className="mt-3 text-xs leading-6 text-white/60">
              Valorisez votre parcours professionnel en toute discrétion. Votre identité et vos coordonnées restent masquées jusqu'à ce que vous validiez l'intérêt pour une mission.
            </p>
          </div>

          {/* Companies */}
          <div className="border border-white/10 bg-[#111111] p-6">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c7a15a]">
              Pour les Entreprises
            </span>
            <h3 className="mt-2 font-serif text-xl">Sourcing Ciblé &amp; Transparence</h3>
            <p className="mt-3 text-xs leading-6 text-white/60">
              Accédez à des profils hautement qualifiés, évalués selon leurs compétences réelles et adéquations culturelles, avec des conditions financières claires et encadrées.
            </p>
          </div>

          {/* Partners */}
          <div className="border border-white/10 bg-[#111111] p-6">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c7a15a]">
              Pour les Partenaires
            </span>
            <h3 className="mt-2 font-serif text-xl">Réseaux Institutionnels &amp; Écoles</h3>
            <p className="mt-3 text-xs leading-6 text-white/60">
              Synergies durables avec les acteurs institutionnels, associations, réseaux d'expatriés et établissements de formation, hors plateformes commerciales d'intérim.
            </p>
          </div>
        </div>

        {/* Professional Contact & Legal Mentions */}
        <div className="border border-white/10 bg-[#111111] p-8 md:p-12">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#c7a15a]">
            Mentions Légales &amp; Coordonnées Professionnelles
          </span>
          <h2 className="mt-3 font-serif text-2xl">Transparence &amp; Gouvernance</h2>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 text-xs text-white/70">
            <div>
              <p className="font-semibold text-white">Raison Sociale &amp; Siège :</p>
              <p className="mt-1">Recrutement Privé SAS</p>
              <p>Saint-Amand-les-Eaux, France</p>
              <p className="mt-2">
                <span className="text-white/40">SIREN / SIRET :</span> [Information légale enregistrée]
              </p>
            </div>

            <div>
              <p className="font-semibold text-white">Contact Professionnel :</p>
              <p className="mt-1">
                E-mail :{" "}
                <a href="mailto:contact@recrutement-prive.com" className="text-[#c7a15a] underline">
                  contact@recrutement-prive.com
                </a>
              </p>
              <p className="mt-1">Téléphone Standard : +33 (0)1 89 00 00 00</p>
              <p className="mt-2">
                <span className="text-white/40">Directeur de la Publication :</span> Direction Recrutement Privé
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="rp-footer mt-16">
        <div className="rp-footer-brand">
          <a href="/" className="rp-brand">
            <span className="rp-logo">RP</span>
            <span className="rp-brand-copy">
              <strong>RECRUTEMENT PRIVÉ</strong>
              <small>EXPERT RECRUTEMENT</small>
            </span>
          </a>
          <p>
            Le recrutement d'excellence,
            <br />
            guidé par l'humain et l'IA.
          </p>
        </div>
        <div>
          <h3>Navigation</h3>
          <a href="/">Accueil</a>
          <a href="/qui-sommes-nous">Qui sommes-nous ?</a>
          <a href="/offres">Offres d'emploi</a>
          <a href="/#contact">Contact</a>
        </div>
        <div>
          <h3>Espaces</h3>
          <a href="/espace/entreprise">Espace Entreprise</a>
          <a href="/espace">Espace Candidat</a>
          <a href="/mentions-legales">Mentions légales</a>
          <a href="/politique-confidentialite">Politique de confidentialité</a>
        </div>
        <div id="contact">
          <h3>Contact</h3>
          <a href="mailto:contact@recrutement-prive.com">✉ contact@recrutement-prive.com</a>
          <span>⌖ Saint-Amand-les-Eaux, France</span>
        </div>
        <div className="rp-copyright">© 2026 Recrutement Privé. Tous droits réservés.</div>
      </footer>
    </main>
  );
}
