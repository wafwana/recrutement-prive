"use client";

import Link from "next/link";

export default function CandidateCvForm() {
  return (
    <div className="mx-auto mt-10 w-full max-w-3xl border border-white/10 bg-[#111] p-8 text-center">
      <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Espace Candidat Sécurisé</p>
      <h2 className="mt-4 font-serif text-3xl md:text-4xl">Déposez votre CV en toute confidentialité.</h2>
      <p className="mt-4 text-sm leading-7 text-white/50">
        Créez votre compte candidat ou connectez-vous pour transmettre votre CV, préciser votre secteur d'expertise et suivre vos opportunités en toute sécurité.
      </p>

      <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
        <Link
          href="/inscription"
          className="border border-[#c7a15a] bg-[#c7a15a] px-8 py-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-black transition hover:bg-transparent hover:text-[#c7a15a]"
        >
          Créer mon compte candidat
        </Link>
        <Link
          href="/connexion"
          className="border border-white/20 px-8 py-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-white transition hover:border-[#c7a15a] hover:text-[#c7a15a]"
        >
          Déjà inscrit ? Se connecter
        </Link>
      </div>
    </div>
  );
}
