import Link from "next/link";

export default function ConnexionPage() {
  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-16 text-white md:px-8 md:py-24">
      <div className="mx-auto max-w-xl border border-white/10 bg-[#111] p-8 md:p-12">
        <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Recrutement Privé</p>
        <h1 className="mt-5 font-serif text-4xl md:text-5xl">Accéder à votre espace.</h1>
        <p className="mt-5 text-sm leading-7 text-white/45">La connexion sécurisée est désormais préparée avec Auth.js et PostgreSQL.</p>
        <form className="mt-10 space-y-5" action="/api/auth/callback/credentials" method="post">
          <label className="block text-xs uppercase tracking-[0.18em] text-white/40">
            Email
            <input name="email" type="email" required className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" />
          </label>
          <label className="block text-xs uppercase tracking-[0.18em] text-white/40">
            Mot de passe
            <input name="password" type="password" required className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" />
          </label>
          <button type="submit" className="w-full border border-[#c7a15a] px-5 py-4 text-[10px] uppercase tracking-[0.22em] text-[#c7a15a] transition hover:bg-[#c7a15a] hover:text-black">
            Se connecter
          </button>
        </form>
        <Link href="/" className="mt-8 inline-block text-[10px] uppercase tracking-[0.2em] text-white/35 hover:text-white">
          ← Retour au site
        </Link>
      </div>
    </main>
  );
}
