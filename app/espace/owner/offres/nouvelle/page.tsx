import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createOwnerJob } from "./actions";

function categoryName(name: unknown) {
  if (typeof name === "string") return name;
  if (name && typeof name === "object") {
    const value = name as Record<string, string>;
    return value.fr || value.en || Object.values(value)[0] || "Catégorie";
  }
  return "Catégorie";
}

export default async function NewOwnerJobPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "OWNER") redirect("/connexion");

  const [companies, categories] = await Promise.all([
    prisma.company.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true, country: true }, orderBy: { name: "asc" } }),
    prisma.jobCategory.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true, parentId: true, sortOrder: true }, orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }] }),
  ]);
  const parents = categories.filter((category) => !category.parentId);

  return (
    <main className="mx-auto w-[min(1100px,calc(100%-40px))] py-12 md:py-20">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#c7a15a]">OWNER · Saisie manuelle</p>
          <h1 className="mt-3 font-serif text-4xl">Rentrer une offre</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/50">Créez une offre native dans le même référentiel que les offres déposées par les entreprises. Le matching et le pipeline existants pourront ensuite la traiter.</p>
        </div>
        <Link href="/espace/owner" className="border border-white/10 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-white/55">Retour OWNER</Link>
      </div>

      {companies.length === 0 ? (
        <div className="mt-10 border border-[#c7a15a]/30 bg-[#111] p-7">
          <p className="text-sm text-white/70">Aucune entreprise active n'est disponible.</p>
          <Link href="/espace/owner/entreprises/nouvelle" className="mt-5 inline-block border border-[#c7a15a] px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-[#c7a15a]">Rentrer une entreprise</Link>
        </div>
      ) : (
        <form action={createOwnerJob} className="mt-10 grid gap-5 border border-white/10 bg-[#111] p-7 md:grid-cols-2">
          <label className="text-xs text-white/50 md:col-span-2">Entreprise *
            <select name="companyId" required className="mt-2 w-full border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none">
              <option value="">Sélectionner l'entreprise</option>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.name}{company.country ? ` · ${company.country}` : ""}</option>)}
            </select>
          </label>
          <label className="text-xs text-white/50">Intitulé du poste *
            <input name="title" required maxLength={160} className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" />
          </label>
          <label className="text-xs text-white/50">Localisation
            <input name="location" maxLength={160} className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" />
          </label>
          <label className="text-xs text-white/50">Métier / catégorie *
            <select name="jobCategoryId" required className="mt-2 w-full border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none">
              <option value="">Sélectionner</option>
              {parents.map((category) => <option key={category.id} value={category.id}>{categoryName(category.name)}</option>)}
            </select>
          </label>
          <label className="text-xs text-white/50">Sous-métier / spécialité
            <select name="subCategoryId" className="mt-2 w-full border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none">
              <option value="">Aucune</option>
              {categories.filter((category) => category.parentId).map((category) => <option key={category.id} value={category.id}>{categoryName(category.name)}</option>)}
            </select>
          </label>
          <label className="text-xs text-white/50">Expérience minimale
            <input name="requiredExperienceYears" type="number" min="0" max="60" className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" />
          </label>
          <label className="text-xs text-white/50">Type de mission
            <input name="missionType" maxLength={100} placeholder="CDI, CDD, chasse..." className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" />
          </label>
          <label className="text-xs text-white/50 md:col-span-2">Compétences requises
            <input name="requiredSkills" maxLength={1500} placeholder="Excel, SAP, management..." className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" />
          </label>
          <label className="text-xs text-white/50 md:col-span-2">Description / brief
            <textarea name="description" rows={6} maxLength={10000} className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" />
          </label>
          <label className="text-xs text-white/50">Statut initial
            <select name="status" defaultValue="DRAFT" className="mt-2 w-full border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none">
              <option value="DRAFT">Brouillon</option>
              <option value="OPEN">Ouverte</option>
              <option value="PAUSED">En pause</option>
            </select>
          </label>
          <div className="flex items-end justify-between gap-4 md:col-span-2">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">L'offre reste isolée dans l'entreprise sélectionnée et est journalisée.</p>
            <button className="border border-[#c7a15a] px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-[#c7a15a]">Enregistrer l'offre</button>
          </div>
        </form>
      )}
    </main>
  );
}
