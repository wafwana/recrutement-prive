import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default async function OwnerEmergencyWorkspacePage() {
  const session = await auth();
  if (
    !session?.user ||
    session.user.role !== "OWNER" ||
    session.user.id !== "owner-emergency-session"
  ) {
    redirect("/connexion");
  }

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-12 text-white md:px-8 md:py-20">
      <section className="mx-auto max-w-4xl border border-amber-500/40 bg-[#111] p-7 md:p-12">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#c7a15a]">Recrutement Privé · OWNER</p>
        <h1 className="mt-5 font-serif text-3xl md:text-5xl">Accès de secours activé</h1>
        <p className="mt-6 text-sm leading-7 text-white/70">
          Vous êtes connecté avec le mécanisme de secours temporaire. La base de données est indisponible :
          les CV, comptes, offres, candidatures, paramètres et actions métier restent désactivés pour éviter
          toute erreur ou perte de données.
        </p>
        <div role="status" className="mt-7 border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
          Mode limité, sans accès aux données PostgreSQL. Ce mécanisme ne modifie ni ne recrée votre compte OWNER.
          Désactivez l’accès de secours dès que la connexion à la base est rétablie.
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <SignOutButton />
          <Link href="/" className="border border-white/20 px-5 py-3 text-xs uppercase tracking-[0.15em] text-white/75 hover:text-white">
            Retour à l’accueil
          </Link>
        </div>
      </section>
    </main>
  );
}
