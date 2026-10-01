import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/auth/permissions";
import BackButton from "@/components/navigation/BackButton";
import { searchPartners } from "@/lib/partenaires/partner-service";
import {
  PARTNER_CATEGORIES,
  PARTNER_STATUSES,
  AGREEMENT_STATUSES,
  getCategoryLabel,
  getSubcategoryLabel,
  getStatusLabel,
} from "@/lib/partenaires/taxonomy";

export default async function OwnerPartenairesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/connexion");
  }

  if (!(await hasPermission(session.user.id, session.user.role, "PARTNERS_MANAGE"))) {
    redirect("/espace/admin");
  }

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const category = typeof sp.category === "string" ? sp.category : "";
  const subCategory = typeof sp.subCategory === "string" ? sp.subCategory : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const agreementStatus = typeof sp.agreementStatus === "string" ? sp.agreementStatus : "";
  const country = typeof sp.country === "string" ? sp.country : "";
  const priority = typeof sp.priority === "string" ? sp.priority : "";

  const results = await searchPartners({
    q,
    category,
    subCategory,
    status,
    agreementStatus,
    country,
    priority,
    take: 100,
  });

  const totalCount = results.total;
  const validatedCount = results.items.filter((item) => item.status === "VALIDATED_PARTNER").length;
  const expatCount = results.items.filter((item) => item.category === "RESEAUX_EXPATRIES").length;
  const univCount = results.items.filter((item) => item.category === "UNIVERSITES_ECOLES").length;
  const cciCount = results.items.filter((item) => item.category === "CHAMBRES_COMMERCE").length;
  const activeAgreementsCount = results.items.reduce((acc, item) => {
    return acc + item.agreements.filter((a) => a.status === "ACTIVE" || a.status === "SIGNED").length;
  }, 0);

  return (
    <section className="mx-auto w-[min(1280px,calc(100%-40px))] py-12 md:w-[min(1280px,calc(100%-72px))] md:py-20">
      <BackButton />

      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">ADMIN · Partenaires & Sources</p>
          <h1 className="mt-4 font-serif text-4xl sm:text-5xl">Partenaires & Sources</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/50">
            Gestion, qualification et recherche centralisée des partenaires institutionnels, éducatifs, associatifs et réseaux d&apos;expatriés à l&apos;international.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/espace/admin/partenaires/sourcing"
            className="border border-[#F97316] bg-[#F97316]/10 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#F97316] hover:bg-[#F97316]/20"
          >
            Sourcing & Découverte
          </Link>
          <Link
            href="/espace/admin/partenaires/nouveau"
            className="border border-[#c7a15a] bg-[#c7a15a]/10 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#c7a15a] hover:bg-[#c7a15a]/20"
          >
            + Rentrer un partenaire
          </Link>
        </div>
      </div>

      <div className="mt-10 grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-6">
        <div className="bg-[#111] p-5">
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Total Organismes</span>
          <p className="mt-3 font-serif text-3xl text-[#c7a15a]">{totalCount}</p>
        </div>
        <div className="bg-[#111] p-5">
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Partenaires Validés</span>
          <p className="mt-3 font-serif text-3xl text-emerald-400">{validatedCount}</p>
        </div>
        <div className="bg-[#111] p-5">
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Accords Actifs</span>
          <p className="mt-3 font-serif text-3xl text-[#F97316]">{activeAgreementsCount}</p>
        </div>
        <div className="bg-[#111] p-5">
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Réseaux Expatriés</span>
          <p className="mt-3 font-serif text-3xl text-white">{expatCount}</p>
        </div>
        <div className="bg-[#111] p-5">
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Universités & Écoles</span>
          <p className="mt-3 font-serif text-3xl text-white">{univCount}</p>
        </div>
        <div className="bg-[#111] p-5">
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">CCI & Réseaux Éco</span>
          <p className="mt-3 font-serif text-3xl text-white">{cciCount}</p>
        </div>
      </div>

      <form method="GET" className="mt-8 border border-white/10 bg-[#111] p-6">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[#c7a15a]">Moteur de recherche multi-critères</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.14em] text-white/40">Recherche textuelle</label>
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Nom, ville, pays, note..."
              className="mt-1.5 w-full border border-white/15 bg-black/50 px-3 py-2 text-xs text-white placeholder-white/30 focus:border-[#c7a15a] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.14em] text-white/40">Catégorie</label>
            <select
              name="category"
              defaultValue={category}
              className="mt-1.5 w-full border border-white/15 bg-black/50 px-3 py-2 text-xs text-white focus:border-[#c7a15a] focus:outline-none"
            >
              <option value="">Toutes les catégories</option>
              {PARTNER_CATEGORIES.map((cat) => (
                <option key={cat.code} value={cat.code}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.14em] text-white/40">Statut du partenaire</label>
            <select
              name="status"
              defaultValue={status}
              className="mt-1.5 w-full border border-white/15 bg-black/50 px-3 py-2 text-xs text-white focus:border-[#c7a15a] focus:outline-none"
            >
              <option value="">Tous les statuts</option>
              {PARTNER_STATUSES.map((st) => (
                <option key={st.code} value={st.code}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.14em] text-white/40">Statut de l&apos;accord</label>
            <select
              name="agreementStatus"
              defaultValue={agreementStatus}
              className="mt-1.5 w-full border border-white/15 bg-black/50 px-3 py-2 text-xs text-white focus:border-[#c7a15a] focus:outline-none"
            >
              <option value="">Tous les accords</option>
              {AGREEMENT_STATUSES.map((ag) => (
                <option key={ag.code} value={ag.code}>
                  {ag.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.14em] text-white/40">Pays / Zone</label>
            <input
              type="text"
              name="country"
              defaultValue={country}
              placeholder="Ex: France, Émirats..."
              className="mt-1.5 w-full border border-white/15 bg-black/50 px-3 py-2 text-xs text-white placeholder-white/30 focus:border-[#c7a15a] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.14em] text-white/40">Priorité</label>
            <select
              name="priority"
              defaultValue={priority}
              className="mt-1.5 w-full border border-white/15 bg-black/50 px-3 py-2 text-xs text-white focus:border-[#c7a15a] focus:outline-none"
            >
              <option value="">Toutes les priorités</option>
              <option value="CRITICAL">Critique</option>
              <option value="HIGH">Haute</option>
              <option value="MEDIUM">Moyenne</option>
              <option value="LOW">Basse</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="w-full border border-[#c7a15a] bg-[#c7a15a] py-2 text-xs uppercase tracking-[0.16em] text-black font-semibold hover:bg-[#b08b46]"
            >
              Filtrer les résultats
            </button>
            <Link
              href="/espace/admin/partenaires"
              className="border border-white/20 px-3 py-2 text-xs uppercase tracking-[0.14em] text-white/60 hover:text-white"
            >
              Réinitialiser
            </Link>
          </div>
        </div>
      </form>

      <div className="mt-8 overflow-hidden border border-white/10">
        <div className="grid grid-cols-1 border-b border-white/10 bg-[#111] px-5 py-4 text-[10px] uppercase tracking-[0.16em] text-white/35 md:grid-cols-[2fr_1.5fr_1fr_1fr_1fr_auto]">
          <span>Organisme / Nom</span>
          <span>Catégorie & Type</span>
          <span>Localisation</span>
          <span>Statut</span>
          <span>Contacts & Accords</span>
          <span>Action</span>
        </div>

        <div>
          {results.items.map((partner) => (
            <article
              key={partner.id}
              className="grid grid-cols-1 gap-3 border-b border-white/10 px-5 py-5 last:border-b-0 md:grid-cols-[2fr_1.5fr_1fr_1fr_1fr_auto] md:items-center"
            >
              <div>
                <Link
                  href={`/espace/admin/partenaires/${partner.id}`}
                  className="text-sm font-semibold text-white/90 hover:text-[#c7a15a]"
                >
                  {partner.officialName}
                </Link>
                {partner.usualName && <p className="mt-0.5 text-xs text-white/40">({partner.usualName})</p>}
                {partner.website && (
                  <a
                    href={partner.website}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block text-[11px] text-[#F97316] hover:underline"
                  >
                    {partner.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </div>

              <div>
                <p className="text-xs text-white/80">{getCategoryLabel(partner.category)}</p>
                <p className="mt-1 text-[11px] text-white/40">
                  {getSubcategoryLabel(partner.category, partner.subCategory)}
                </p>
              </div>

              <div className="text-xs text-white/65">
                <p>{[partner.city, partner.country].filter(Boolean).join(", ") || "—"}</p>
                {partner.region && <p className="text-[10px] text-white/35">{partner.region}</p>}
              </div>

              <div>
                <span
                  className={`inline-block border px-2.5 py-1 text-[10px] uppercase tracking-wider font-medium ${
                    partner.status === "VALIDATED_PARTNER"
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : partner.status === "AGREEMENT_IN_PREPARATION" || partner.status === "IN_DISCUSSION"
                      ? "border-[#F97316]/40 bg-[#F97316]/10 text-[#F97316]"
                      : "border-white/20 bg-white/5 text-white/60"
                  }`}
                >
                  {getStatusLabel(partner.status)}
                </span>
                <p className="mt-1 text-[10px] text-white/30">
                  Priorité : {partner.priority}
                </p>
              </div>

              <div className="text-xs text-white/50 space-y-1">
                <p>👤 {partner.contacts.length} contact(s)</p>
                <p>📜 {partner.agreements.length} accord(s)</p>
              </div>

              <div>
                <Link
                  href={`/espace/admin/partenaires/${partner.id}`}
                  className="inline-block border border-[#c7a15a]/50 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[#c7a15a] hover:bg-[#c7a15a]/10"
                >
                  Fiche Organisme →
                </Link>
              </div>
            </article>
          ))}

          {results.items.length === 0 && (
            <div className="px-5 py-16 text-center text-sm text-white/40">
              Aucun partenaire ou organisme trouvé pour ces critères de recherche.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
