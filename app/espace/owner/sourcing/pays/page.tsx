import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import EnterpriseSourcingCountriesClient from "@/components/owner/EnterpriseSourcingCountriesClient";

export default async function EnterpriseSourcingCountriesPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "OWNER") redirect("/connexion");

  return (
    <main className="mx-auto w-[min(1100px,calc(100%-40px))] py-12 md:py-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#c7a15a]">OWNER · Sourcing entreprise</p>
          <h1 className="mt-3 font-serif text-4xl">Pays ciblés par entreprise</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/55">
            Configurez les pays dont les offres publiques peuvent être qualifiées pour chaque entreprise. Cette configuration ne lance pas le sourcing et n’envoie aucun message.
          </p>
        </div>
        <Link href="/espace/owner/sourcing" className="border border-white/10 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-white/60">Retour au sourcing</Link>
      </div>
      <EnterpriseSourcingCountriesClient />
    </main>
  );
}
