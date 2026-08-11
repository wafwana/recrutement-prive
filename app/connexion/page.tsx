"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

export default function ConnexionPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirect: false,
      callbackUrl: "/espace",
    });

    if (result?.error) {
      setError("Identifiants invalides. Vérifiez votre email et votre mot de passe.");
      setPending(false);
      return;
    }

    window.location.assign(result?.url ?? "/espace");
  }

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-16 text-white md:px-8 md:py-24">
      <div className="mx-auto max-w-xl border border-white/10 bg-[#111] p-8 md:p-12">
        <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Recrutement Privé</p>
        <h1 className="mt-5 font-serif text-4xl md:text-5xl">Accéder à votre espace.</h1>
        <p className="mt-5 text-sm leading-7 text-white/45">Connectez-vous pour retrouver votre parcours, vos recrutements et vos échanges.</p>
        <form className="mt-10 space-y-5" onSubmit={handleSubmit}>
          <label className="block text-xs uppercase tracking-[0.18em] text-white/40">
            Email
            <input name="email" type="email" autoComplete="email" required className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" />
          </label>
          <label className="block text-xs uppercase tracking-[0.18em] text-white/40">
            Mot de passe
            <input name="password" type="password" autoComplete="current-password" required className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" />
          </label>
          {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
          <button disabled={pending} type="submit" className="w-full border border-[#c7a15a] px-5 py-4 text-[10px] uppercase tracking-[0.22em] text-[#c7a15a] transition hover:bg-[#c7a15a] hover:text-black disabled:cursor-not-allowed disabled:opacity-50">
            {pending ? "Connexion…" : "Se connecter"}
          </button>
        </form>
        <Link href="/" className="mt-8 inline-block text-[10px] uppercase tracking-[0.2em] text-white/35 hover:text-white">
          ← Retour au site
        </Link>
      </div>
    </main>
  );
}
