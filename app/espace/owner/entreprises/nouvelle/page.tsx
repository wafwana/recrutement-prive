import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createOwnerCompany } from "./actions";
import { PHONE_COUNTRIES } from "@/lib/phone-countries";

export default async function NewOwnerCompanyPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "OWNER") redirect("/connexion");

  return (
    <main className="mx-auto w-[min(1000px,calc(100%-40px))] py-12 md:py-20">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#c7a15a]">OWNER · Saisie manuelle</p>
          <h1 className="mt-3 font-serif text-4xl">Rentrer une entreprise</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/50">Ajoutez une entreprise au référentiel existant. Un contrôle anti-doublon est effectué avant la création.</p>
        </div>
        <Link href="/espace/owner" className="border border-white/10 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-white/55">Retour OWNER</Link>
      </div>

      <form action={createOwnerCompany} className="mt-10 grid gap-5 border border-white/10 bg-[#111] p-7 md:grid-cols-2">
        <label className="text-xs text-white/50">Nom de l'entreprise *
          <input name="name" required maxLength={180} className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" />
        </label>
        <label className="text-xs text-white/50">Site web
          <input name="website" type="url" placeholder="https://..." className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" />
        </label>
        <label className="text-xs text-white/50">Pays
          <select name="country" defaultValue="France" className="mt-2 w-full border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none">
            {PHONE_COUNTRIES.map(([country]) => <option key={country} value={country}>{country}</option>)}
          </select>
        </label>
        <label className="text-xs text-white/50">Préfixe téléphonique
          <select name="phonePrefix" defaultValue="+33" className="mt-2 w-full border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none">
            {PHONE_COUNTRIES.map(([country, prefix]) => <option key={`${country}-${prefix}`} value={prefix}>{prefix} · {country}</option>)}
          </select>
        </label>
        <label className="text-xs text-white/50">Téléphone
          <input name="phone" type="tel" maxLength={40} className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" />
        </label>
        <label className="text-xs text-white/50 md:col-span-2">Présentation / description
          <textarea name="description" rows={5} maxLength={2000} className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-4 md:col-span-2">
          <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">Création réservée à l'OWNER · aucune donnée existante n'est remplacée.</p>
          <button className="border border-[#c7a15a] px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-[#c7a15a]">Enregistrer l'entreprise</button>
        </div>
      </form>
    </main>
  );
}
