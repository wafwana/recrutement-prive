import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createOwnerJob } from "./actions";

async function submitOwnerJob(formData: FormData) {\n  "use server";\n  await createOwnerJob(formData);\n}\n\nexport default async function NewOwnerJobPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "OWNER") redirect("/connexion");

  const companies = await prisma.company.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, country: true },
    orderBy: { name: "asc" },
  });

  return (
    <main className="mx-auto w-[min(1100px,calc(100%-40px))] py-12 md:py-20">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#c7a15a]">OWNER · Saisie manuelle</p>
          <h1 className="mt-3 font-serif text-4xl">Rentrer une offre</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/50">
            Saisissez simplement l'entreprise, l'intitulé et le contenu disponible de l'offre.
            L'IA complète et structure les informations exploitables : métier, catégorie, sous-métier,
            compétences, expérience, localisation, type de mission et descriptif, puis lance le matching.
          </p>
        </div>
        <Link href="/espace/owner" className="border border-white/10 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-white/55">Retour OWNER</Link>
      </div>

      {companies.length === 0 ? (
        <div className="mt-10 border border-[#c7a15a]/30 bg-[#111] p-7">
          <p className="text-sm text-white/70">Aucune entreprise active n'est disponible.</p>
          <Link href="/espace/owner/entreprises/nouvelle" className="mt-5 inline-block border border-[#c7a15a] px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-[#c7a15a]">Rentrer une entreprise</Link>
        </div>
      ) : (
        <form action={submitOwnerJob} className="mt-10 grid gap-5 border border-white/10 bg-[#111] p-7">
          <label className="text-xs text-white/50">Entreprise *
            <select name="companyId" required className="mt-2 w-full border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none">
              <option value="">Sélectionner l'entreprise</option>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.name}{company.country ? ` · ${company.country}` : ""}</option>)}
            </select>
            <span className="mt-2 block text-[10px] text-white/30">La sélection reste explicite pour garantir l'isolation de l'offre dans la bonne entreprise.</span>
          </label>

          <label className="text-xs text-white/50">Intitulé du poste *
            <input name="title" required maxLength={160} placeholder="Ex. Directeur commercial international" className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" />
          </label>

          <label className="text-xs text-white/50">Contenu de l'offre
            <textarea
              name="description"
              rows={12}
              maxLength={10000}
              placeholder="Collez ici l'offre complète, le brief de recrutement ou les informations dont vous disposez. L'IA analysera le contenu et complétera les champs exploitables."
              className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none"
            />
          </label>

          <label className="text-xs text-white/50">Statut initial
            <select name="status" defaultValue="DRAFT" className="mt-2 w-full border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none">
              <option value="DRAFT">Brouillon</option>
              <option value="OPEN">Ouverte</option>
              <option value="PAUSED">En pause</option>
            </select>
            <span className="mt-2 block text-[10px] text-white/30">Le statut reste une décision de l'OWNER ; l'IA ne publie pas automatiquement une offre.</span>
          </label>

          <div className="border border-white/10 p-5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#c7a15a]">Après l'enregistrement</p>
            <p className="mt-3 text-sm leading-6 text-white/50">
              Analyse IA → classification métier → enrichissement de l'offre → matching des candidats actifs → journalisation.
              Les CV manuels en « CV en attente » ne sont pas débloqués par cette opération.
            </p>
          </div>

          <div className="flex items-center justify-between gap-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">Entreprise isolée · analyse · matching · traçabilité</p>
            <button className="border border-[#c7a15a] px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-[#c7a15a]">Analyser et enregistrer l'offre</button>
          </div>
        </form>
      )}
    </main>
  );
}
