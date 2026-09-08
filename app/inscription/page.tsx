"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { registerCandidate } from "./actions";
import { PHONE_COUNTRIES } from "@/lib/phone-countries";
import { PASSWORD_REQUIREMENTS, validatePassword } from "@/lib/password-policy";
import { signIn } from "next-auth/react";

export default function InscriptionPage() {
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  const passwordVal = validatePassword(password);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const pass = String(formData.get("password") ?? "");

    const val = validatePassword(pass);
    if (!val.isValid) {
      setError("Le mot de passe ne respecte pas toutes les règles de sécurité.");
      return;
    }

    setPending(true);

    const result = await registerCandidate(formData);

    if (!result.ok) {
      setError(result.error || "Impossible de créer le compte.");
      setPending(false);
      return;
    }

    const email = String(formData.get("email") ?? "");
    const signInResult = await signIn("credentials", {
      email,
      password: pass,
      redirect: false,
      callbackUrl: "/espace",
    });

    if (signInResult?.error) {
      window.location.assign("/connexion?registered=true");
    } else {
      window.location.assign(signInResult?.url ?? "/espace");
    }
  }

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-16 text-white md:px-8 md:py-24">
      <div className="mx-auto max-w-xl border border-white/10 bg-[#111] p-8 md:p-12">
        <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Recrutement Privé</p>
        <h1 className="mt-5 font-serif text-4xl md:text-5xl">Créer un compte candidat.</h1>
        <p className="mt-5 text-sm leading-7 text-white/45">
          Inscrivez-vous pour déposer votre candidature et accéder à votre espace sécurisé.
        </p>

        <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
          <label className="block text-xs uppercase tracking-[0.18em] text-white/40">
            Nom complet / Prénom et Nom *
            <input
              name="name"
              type="text"
              required
              maxLength={100}
              placeholder="ex: Jean Dupont"
              className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none"
            />
          </label>

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

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs uppercase tracking-[0.18em] text-white/40">
              Pays de résidence
              <input
                name="country"
                type="text"
                defaultValue="France"
                maxLength={120}
                placeholder="ex: France"
                className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none"
              />
            </label>

            <div>
              <span className="block text-xs uppercase tracking-[0.18em] text-white/40">Téléphone</span>
              <div className="mt-2 grid grid-cols-[1.2fr_1.8fr] gap-2">
                <select
                  name="phonePrefix"
                  defaultValue="+33"
                  aria-label="Préfixe téléphonique"
                  className="border border-white/10 bg-[#111] px-2 py-3 text-xs text-white outline-none"
                >
                  {PHONE_COUNTRIES.map(([c, p]) => (
                    <option key={`${c}-${p}`} value={p}>
                      {p} · {c}
                    </option>
                  ))}
                </select>
                <input
                  name="phone"
                  type="tel"
                  maxLength={40}
                  placeholder="06 12 34 56 78"
                  className="w-full border border-white/10 bg-transparent px-3 py-3 text-sm text-white outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-[0.18em] text-white/40">
              Mot de passe *
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Exemple : Recrutement@1"
                className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none"
              />
            </label>

            <div className="mt-3 border border-white/5 bg-black/30 p-4 text-xs">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#c7a15a]">
                Exigences du mot de passe :
              </p>
              <ul className="space-y-1 text-white/60">
                {PASSWORD_REQUIREMENTS.map((req, idx) => {
                  let satisfied = false;
                  if (idx === 0) satisfied = password.length >= 8;
                  if (idx === 1) satisfied = /[A-Z]/.test(password);
                  if (idx === 2) satisfied = /[a-z]/.test(password);
                  if (idx === 3) satisfied = /[0-9]/.test(password);
                  if (idx === 4) satisfied = /[^A-Za-z0-9]/.test(password);

                  return (
                    <li key={req} className="flex items-center gap-2">
                      <span className={satisfied ? "text-emerald-400" : "text-white/30"}>
                        {satisfied ? "✓" : "○"}
                      </span>
                      <span className={satisfied ? "text-white/90" : "text-white/50"}>{req}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-[11px] italic text-white/40">
                Exemple valide : <code className="text-[#c7a15a]">Recrutement@1</code>
              </p>
            </div>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          ) : null}

          <button
            disabled={pending || !passwordVal.isValid}
            type="submit"
            className="w-full border border-[#c7a15a] px-5 py-4 text-[10px] uppercase tracking-[0.22em] text-[#c7a15a] transition hover:bg-[#c7a15a] hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Création du compte…" : "Créer mon compte"}
          </button>
        </form>

        <div className="mt-8 flex flex-col gap-3 text-[10px] uppercase tracking-[0.2em] text-white/35 sm:flex-row sm:justify-between">
          <Link href="/connexion" className="hover:text-white">
            Déjà inscrit ? Se connecter
          </Link>
          <Link href="/" className="hover:text-white">
            ← Retour au site
          </Link>
        </div>
      </div>
    </main>
  );
}
