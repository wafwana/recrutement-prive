import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { searchPartners } from "@/lib/partenaires/partner-service";

export default async function AdminPartenairesPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/connexion");
  if (!(await hasPermission(session.user.id, session.user.role, "PARTNERS_MANAGE"))) redirect("/espace/admin");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const country = typeof sp.country === "string" ? sp.country : "";
  const category = typeof sp.category === "string" ? sp.category : "";
  const results = await searchPartners({ q, country, category, take: 100 });
  return (
    <section className="mx-auto w-[min(1280px,calc(100%-40px))] py-12 md:w-[min(1280px,calc(100%-72px))] md:py-20">
      <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Admin · Partenaires & Sources</p>
      <h1 className="mt-4 font-serif text-4xl sm:text-5xl">Partenaires & Sources</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-white/50">Espace ADMIN séparé du cockpit Owner. Seuls les partenaires autorisés par la permission PARTNERS_MANAGE sont visibles.</p>
      <form method="GET" className="mt-8 grid gap-3 border border-white/10 bg-[#111] p-5 md:grid-cols-[2fr_1fr_1fr_auto]">
        <input name="q" defaultValue={q} placeholder="Nom, ville, pays..." className="border border-white/15 bg-black/40 px-3 py-2 text-xs text-white" />
        <input name="country" defaultValue={country} placeholder="Pays" className="border border-white/15 bg-black/40 px-3 py-2 text-xs text-white" />
        <input name="category" defaultValue={category} placeholder="Catégorie" className="border border-white/15 bg-black/40 px-3 py-2 text-xs text-white" />
        <button className="border border-[#c7a15a] px-4 py-2 text-[10px] uppercase tracking-wider text-[#c7a15a]">Filtrer</button>
      </form>
      <div className="mt-8 border border-white/10">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] border-b border-white/10 bg-[#111] px-5 py-4 text-[10px] uppercase tracking-wider text-white/35"><span>Organisme</span><span>Catégorie</span><span>Localisation</span><span>Statut</span></div>
        {results.items.map((partner) => <div key={partner.id} className="grid grid-cols-[2fr_1fr_1fr_1fr] border-b border-white/10 px-5 py-4 text-xs"><span className="text-white/85">{partner.officialName}</span><span className="text-white/55">{partner.category}</span><span className="text-white/55">{[partner.city, partner.country].filter(Boolean).join(", ") || "—"}</span><span className="text-white/55">{partner.status}</span></div>)}
        {results.items.length === 0 && <div className="px-5 py-12 text-center text-sm text-white/35">Aucun partenaire trouvé.</div>}
      </div>
    </section>
  );
}