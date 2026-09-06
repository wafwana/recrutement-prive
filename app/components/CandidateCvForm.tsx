"use client";

import Link from "next/link";

export default function CandidateCvForm() {
  return (
    <div className="mx-auto mt-10 w-full max-w-3xl border border-white/10 bg-[#111] p-8 text-left">
      <p className="text-sm leading-7 text-white/55">
        Le dépôt de CV se fait désormais depuis votre espace candidat sécurisé.
        Créez votre compte ou connectez-vous pour déposer et gérer vos documents en toute confidentialité.
      </p>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/inscription"
          className="border border-[#c7a15a] px-6 py-3 text-center text-[10px] uppercase tracking-[0.22em] text-[#c7a15a] transition hover:bg-[#c7a15a] hover:text-black"
        >
          Créer mon compte candidat
        </Link>
        <Link
          href="/connexion"
          className="border border-white/15 px-6 py-3 text-center text-[10px] uppercase tracking-[0.22em] text-white/65 transition hover:border-white/35 hover:text-white"
        >
          Me connecter
        </Link>
      </div>
    </div>
  );
}
