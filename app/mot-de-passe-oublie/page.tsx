"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { requestPasswordReset } from "./actions";

export default function MotDePasseOubliePage() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const result = await requestPasswordReset(formData);

    setMessage(result.message);
    setPending(false);
  }

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-16 text-white md:px-8 md:py-24">
      <div className="mx-auto max-w-xl border border-white/10 bg-[#111] p-8 md:p-12">
        <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Recrutement Privé</p>
        <h1 className="mt-5 font-serif text-4xl md:text-5xl">Mot de passe oublié.</h1>
        <p className="mt-5 text-sm leading-7 text-white/45">
          Saisissez votre adresse email pour recevoir un lien de réinitialisation sécurisé.
        </p>

        {message ? (
          <div className="mt-8 border border-[#c7a15a]/30 bg-[#c7a15a]/10 p-5 text-sm leading-6 text-[#c7a15a]">
            {message}
          </div>
        ) : (
          <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
            <label className="block text-xs uppercase tracking-[0.18em] text-white/40">
              Adresse email *
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="ex: jean.dupont@exemple.com"
                className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none"
              />
            </label>

            <button
              disabled={pending}
              type="submit"
              className="w-full border border-[#c7a15a] px-5 py-4 text-[10px] uppercase tracking-[0.22em] text-[#c7a15a] transition hover:bg-[#c7a15a] hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Envoi de la demande…" : "Envoyer le lien de réinitialisation"}
            </button>
          </form>
        )}

        <div className="mt-8 flex flex-col gap-3 text-[10px] uppercase tracking-[0.2em] text-white/35 sm:flex-row sm:justify-between">
          <Link href="/connexion" className="hover:text-white">
            ← Se connecter
          </Link>
          <Link href="/inscription" className="hover:text-white">
            Créer un compte
          </Link>
        </div>
      </div>
    </main>
  );
}
