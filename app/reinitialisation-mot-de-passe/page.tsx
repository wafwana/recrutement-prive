"use client";

import Link from "next/link";
import { FormEvent, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { resetPassword } from "./actions";
import { PASSWORD_REQUIREMENTS, validatePassword } from "@/lib/password-policy";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const passwordVal = validatePassword(password);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("Jeton de réinitialisation manquant.");
      return;
    }

    const val = validatePassword(password);
    if (!val.isValid) {
      setError("Le mot de passe ne respecte pas toutes les règles de sécurité.");
      return;
    }

    setPending(true);

    const formData = new FormData(event.currentTarget);
    formData.set("token", token);

    const result = await resetPassword(formData);

    if (!result.ok) {
      setError(result.error || "Impossible de réinitialiser le mot de passe.");
      setPending(false);
      return;
    }

    window.location.assign("/connexion?reset=true");
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-xl border border-white/10 bg-[#111] p-8 md:p-12 text-center">
        <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Recrutement Privé</p>
        <h1 className="mt-5 font-serif text-3xl">Lien invalide</h1>
        <p className="mt-4 text-sm text-white/50">
          Ce lien de réinitialisation est incomplet ou invalide. Veuillez effectuer une nouvelle demande.
        </p>
        <Link
          href="/mot-de-passe-oublie"
          className="mt-8 inline-block border border-[#c7a15a] px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-[#c7a15a] hover:bg-[#c7a15a] hover:text-black transition"
        >
          Demander un nouveau lien
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl border border-white/10 bg-[#111] p-8 md:p-12">
      <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Recrutement Privé</p>
      <h1 className="mt-5 font-serif text-4xl md:text-5xl">Nouveau mot de passe.</h1>
      <p className="mt-5 text-sm leading-7 text-white/45">
        Définissez un nouveau mot de passe respectant nos exigences de sécurité.
      </p>

      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div>
          <label className="block text-xs uppercase tracking-[0.18em] text-white/40">
            Nouveau mot de passe *
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

        {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}

        <button
          disabled={pending || !passwordVal.isValid}
          type="submit"
          className="w-full border border-[#c7a15a] px-5 py-4 text-[10px] uppercase tracking-[0.22em] text-[#c7a15a] transition hover:bg-[#c7a15a] hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Réinitialisation…" : "Réinitialiser mon mot de passe"}
        </button>
      </form>

      <div className="mt-8 flex justify-between text-[10px] uppercase tracking-[0.2em] text-white/35">
        <Link href="/connexion" className="hover:text-white">
          ← Annuler et se connecter
        </Link>
      </div>
    </div>
  );
}

export default function ReinitialisationMotDePassePage() {
  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-16 text-white md:px-8 md:py-24">
      <Suspense fallback={<div className="mx-auto max-w-xl text-center text-white/50">Chargement…</div>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
