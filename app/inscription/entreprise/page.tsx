"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { registerCompany } from "./actions";
import { PHONE_COUNTRIES } from "@/lib/phone-countries";
import { PASSWORD_REQUIREMENTS, validatePassword } from "@/lib/password-policy";
import { signIn } from "next-auth/react";
import { CompanySiretLookup, type CompanyLookupResult } from "@/app/components/CompanySiretLookup";

export default function InscriptionEntreprisePage() {
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [siret, setSiret] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [country, setCountry] = useState("France");
  const [address, setAddress] = useState("");
  const [legalForm, setLegalForm] = useState("");
  const [apeCode, setApeCode] = useState("");
  const [siren, setSiren] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceCollectedAt, setSourceCollectedAt] = useState("");

  const passwordVal = validatePassword(password);\n\n  function applyCompanyLookup(data: CompanyLookupResult) {\n    setSiret(data.siret || "");\n    setSiren(data.siren || "");\n    setCompanyName(data.name || "");\n    setWebsite(data.website || "");\n    setCountry(data.country || "France");\n    setAddress([data.address, [data.postalCode, data.city].filter(Boolean).join(" ")].filter(Boolean).join(", "));\n    setLegalForm(data.legalForm || "");\n    setApeCode(data.apeCode || "");\n    setSourceType(data.sourceType || "");\n    setSourceUrl(data.sourceUrl || "");\n    setSourceCollectedAt(data.collectedAt || "");\n  }

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

    const result = await registerCompany(formData);

    if (!result.ok) {
      setError(result.error || "Impossible de créer le compte entreprise.");
      setPending(false);
      return;
    }

    const email = String(formData.get("email") ?? "");
    const signInResult = await signIn("credentials", {
      email,
      password: pass,
      redirect: false,
      callbackUrl: "/espace/entreprise",
    });

    if (signInResult?.error) {
      window.location.assign("/connexion?registered=true");
    } else {
      window.location.assign(signInResult?.url ?? "/espace/entreprise");
    }
  }

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-16 text-white md:px-8 md:py-24">
      <div className="mx-auto max-w-xl border border-white/10 bg-[#111] p-8 md:p-12">
        <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Recrutement Privé · Entreprises</p>
        <h1 className="mt-5 font-serif text-4xl md:text-5xl">Créer un compte entreprise.</h1>
        <p className="mt-5 text-sm leading-7 text-white/45">
          Inscrivez votre entreprise pour mandater des missions de recrutement et consulter les profils qualifiés.
        </p>

        <form className="mt-10 space-y-6" onSubmit={handleSubmit}>\n          <CompanySiretLookup value={siret} onChange={setSiret} onFound={applyCompanyLookup} />\n          <input type="hidden" name="siren" value={siren} />\n          <input type="hidden" name="siret" value={siret} />\n          <input type="hidden" name="legalForm" value={legalForm} />\n          <input type="hidden" name="apeCode" value={apeCode} />\n          <input type="hidden" name="address" value={address} />\n          <input type="hidden" name="sourceType" value={sourceType} />\n          <input type="hidden" name="sourceUrl" value={sourceUrl} />\n          <input type="hidden" name="sourceCollectedAt" value={sourceCollectedAt} />
          <label className="block text-xs uppercase tracking-[0.18em] text-white/40">
            Nom de l&apos;entreprise *
            <input
              name="companyName"
              type="text"
              required
              maxLength={120}
              placeholder="ex: AcroCorp SA"
              className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none"
            />
          </label>

          <label className="block text-xs uppercase tracking-[0.18em] text-white/40">
            Nom complet du représentant / recruteur *
            <input
              name="userName"
              type="text"
              required
              maxLength={100}
              placeholder="ex: Marie Curie"
              className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none"
            />
          </label>

          <label className="block text-xs uppercase tracking-[0.18em] text-white/40">
            Adresse email professionnelle *
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="ex: contact@acrocorp.com"
              className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none"
            />
          </label>

          <label className="block text-xs uppercase tracking-[0.18em] text-white/40">
            Site web de l&apos;entreprise
            <input
              name="website"
              type="url"
              maxLength={250}
              placeholder="https://www.acrocorp.com"
              className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs uppercase tracking-[0.18em] text-white/40">
              Pays du siège
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
                  placeholder="01 23 45 67 89"
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
            {pending ? "Création du compte…" : "Créer le compte entreprise"}
          </button>
        </form>

        <p className="mt-5 text-[11px] leading-5 text-white/35">Les informations préremplies à partir du SIRET proviennent d’une source publique et doivent être vérifiées avant validation.</p>\n\n        <div className="mt-8 flex flex-col gap-3 text-[10px] uppercase tracking-[0.2em] text-white/35 sm:flex-row sm:justify-between">
          <Link href="/inscription" className="hover:text-white">
            Inscription candidat
          </Link>
          <Link href="/connexion" className="hover:text-white">
            Déjà inscrit ? Connexion
          </Link>
        </div>
      </div>
    </main>
  );
}
