"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function OwnerInitialisationPage() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setPending(true);

    try {
      const response = await fetch("/api/owner/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, email, password, name }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(String(data.error || "L'initialisation du compte OWNER a échoué."));
        return;
      }

      setSuccess("Compte OWNER créé avec succès. Vous pouvez maintenant vous connecter.");
      setSecret("");
      setPassword("");
      setTimeout(() => router.push("/connexion?owner=created"), 900);
    } catch {
      setError("Impossible de contacter le serveur. Réessayez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-16 text-white md:px-8 md:py-24">
      <div className="mx-auto max-w-xl border border-white/10 bg-[#111] p-8 md:p-12">
        <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Recrutement Privé · Administration</p>
        <h1 className="mt-5 font-serif text-4xl md:text-5xl">Initialiser le compte OWNER.</h1>
        <p className="mt-5 text-sm leading-7 text-white/45">
          Cette page sert uniquement à initialiser le premier compte OWNER. Elle ne permet pas de créer un second OWNER.
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block text-xs uppercase tracking-[0.18em] text-white/40">
            Secret d'initialisation
            <input name="secret" type="password" autoComplete="off" required value={secret} onChange={(e) => setSecret(e.target.value)} className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" />
          </label>
          <label className="block text-xs uppercase tracking-[0.18em] text-white/40">
            Nom
            <input name="name" type="text" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" />
          </label>
          <label className="block text-xs uppercase tracking-[0.18em] text-white/40">
            Email OWNER
            <input name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" />
          </label>
          <label className="block text-xs uppercase tracking-[0.18em] text-white/40">
            Mot de passe OWNER
            <input name="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" />
          </label>

          {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
          {success ? <p role="status" className="border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">{success}</p> : null}

          <button disabled={pending} type="submit" className="w-full border border-[#c7a15a] px-5 py-4 text-[10px] uppercase tracking-[0.22em] text-[#c7a15a] transition hover:bg-[#c7a15a] hover:text-black disabled:cursor-not-allowed disabled:opacity-50">
            {pending ? "Initialisation…" : "Créer le compte OWNER"}
          </button>
        </form>

        <p className="mt-6 text-xs leading-6 text-white/35">
          Le secret est transmis uniquement au serveur pour l'initialisation. Ne le partagez jamais.
        </p>
      </div>
    </main>
  );
}
