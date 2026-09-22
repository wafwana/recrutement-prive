import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { RP_TAXONOMY } from "@/lib/taxonomy/rp-taxonomy";
import { buildProfessionRoot } from "@/lib/cv/folders";
import { ensureTaxonomySynced } from "@/lib/taxonomy/sync";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OwnerMetiersPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "OWNER") redirect("/connexion");

  const params = await searchParams;
  await ensureTaxonomySynced();
  const selectedSector = one(params.sector) || "";
  const selectedProfession = one(params.profession) || "";

  const documents = await prisma.cvIntake.findMany({
    orderBy: { createdAt: "desc" },
    take: 5000,
    select: { id: true, name: true, candidateName: true, candidateEmail: true, folderPath: true, status: true, createdAt: true },
  });

  const professionFolders = RP_TAXONOMY.flatMap((sector) => sector.subcategories.map((profession) => ({
    sectorCode: sector.code, sectorName: sector.name.fr, professionCode: profession.code, professionName: profession.name.fr,
    root: buildProfessionRoot(sector.code, profession.code),
  })));

  const selected = professionFolders.find((item) => item.sectorCode === selectedSector && item.professionCode === selectedProfession);
  const selectedDocuments = selected ? documents.filter((document) => document.folderPath === selected.root || document.folderPath.startsWith(selected.root + "/")) : [];

  const counts = new Map<string, number>();
  for (const document of documents) {
    const match = professionFolders.find((item) => document.folderPath === item.root || document.folderPath.startsWith(item.root + "/"));
    if (match) counts.set(match.root, (counts.get(match.root) || 0) + 1);
  }

  const totalProfessions = professionFolders.length;
  const filledProfessions = professionFolders.filter((item) => (counts.get(item.root) || 0) > 0).length;

  return (
    <section className="mx-auto w-[min(1280px,calc(100%-40px))] py-12 md:w-[min(1280px,calc(100%-72px))] md:py-20">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div><p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">OWNER · MÉTIERS & DOSSIERS</p><h1 className="mt-3 font-serif text-4xl text-white">Tous les métiers proposés</h1><p className="mt-4 max-w-4xl text-sm leading-7 text-white/50">La taxonomie complète de Recrutement Privé est affichée ici. Chaque secteur et chaque métier dérivé possède son propre dossier, même lorsqu’il est encore vide.</p></div>
        <Link href="/espace/owner" className="border border-white/15 px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-white/65">Retour Owner</Link>
      </div>
      <div className="mt-8 grid gap-px bg-white/10 sm:grid-cols-3">
        <div className="bg-[#111] p-5"><p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Métiers / dérivés</p><p className="mt-3 font-serif text-3xl text-[#c7a15a]">{totalProfessions}</p></div>
        <div className="bg-[#111] p-5"><p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Dossiers alimentés</p><p className="mt-3 font-serif text-3xl text-[#c7a15a]">{filledProfessions}</p></div>
        <div className="bg-[#111] p-5"><p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Dossiers vides</p><p className="mt-3 font-serif text-3xl text-white/70">{totalProfessions - filledProfessions}</p></div>
      </div>
      {selected ? (
        <section className="mt-8 border border-[#c7a15a]/40 bg-[#111] p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-[10px] uppercase tracking-[0.22em] text-[#c7a15a]">{selected.sectorName}</p><h2 className="mt-2 font-serif text-3xl text-white">{selected.professionName}</h2><p className="mt-3 text-xs font-mono text-white/35">{selected.root}</p></div><Link href="/espace/owner/metiers" className="border border-white/15 px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-white/60">Fermer le dossier</Link></div>
          <div className="mt-7 space-y-3">
            {selectedDocuments.map((document) => <article key={document.id} className="flex flex-col gap-3 border border-white/10 bg-[#0b0b0b] p-5 md:flex-row md:items-center md:justify-between"><div><p className="text-sm text-white/80">{document.name}</p><p className="mt-1 text-xs text-white/45">{document.candidateName || "Candidat non renseigné"}{document.candidateEmail ? " · " + document.candidateEmail : ""}</p><p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/30">{document.status} · {new Date(document.createdAt).toLocaleString("fr-FR")}</p></div><a href={"/api/owner/cv-intake/" + document.id + "/original"} target="_blank" rel="noreferrer" className="border border-[#c7a15a] px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-[#c7a15a]">Ouvrir le CV ↗</a></article>)}
            {selectedDocuments.length === 0 && <div className="border border-dashed border-white/15 bg-[#0b0b0b] px-6 py-10 text-center"><p className="text-sm text-white/60">Dossier actuellement vide.</p><p className="mt-2 text-xs text-white/30">Le dossier existe déjà et peut recevoir des CV sans créer de nouveau dossier.</p><Link href="/espace/owner/cv-intake" className="mt-5 inline-block border border-[#F97316] px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-[#F97316]">Intégrer un CV</Link></div>}
          </div>
        </section>
      ) : null}
      <div className="mt-8 space-y-8">
        {RP_TAXONOMY.map((sector) => <section key={sector.code} className="border border-white/10 bg-[#111] p-6"><div className="flex flex-col gap-2 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between"><div><p className="text-[10px] uppercase tracking-[0.22em] text-[#c7a15a]">SECTEUR</p><h2 className="mt-2 font-serif text-2xl text-white">{sector.name.fr}</h2><p className="mt-1 text-xs text-white/30">{sector.positioning.fr}</p></div><span className="text-[10px] uppercase tracking-[0.14em] text-white/30">{sector.subcategories.length} métiers / dérivés</span></div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sector.subcategories.map((profession) => {
              const root = buildProfessionRoot(sector.code, profession.code); const count = counts.get(root) || 0; const isSelected = selected?.root === root;
              return <Link key={profession.code} href={"/espace/owner/metiers?sector=" + encodeURIComponent(sector.code) + "&profession=" + encodeURIComponent(profession.code)} className={"border p-5 transition " + (isSelected ? "border-[#c7a15a] bg-[#c7a15a]/10" : "border-white/10 bg-[#0b0b0b] hover:border-white/25")}><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-white/80">{profession.name.fr}</p><p className="mt-2 text-[10px] font-mono text-white/25">{profession.code}</p></div><span className={"shrink-0 px-2 py-1 text-[9px] uppercase tracking-[0.12em] " + (count ? "bg-emerald-500/10 text-emerald-300" : "bg-white/5 text-white/30")}>{count} CV</span></div><p className="mt-4 text-[10px] uppercase tracking-[0.14em] text-[#c7a15a]">Ouvrir le dossier →</p></Link>;
            })}
          </div>
        </section>) }
      </div>
    </section>
  );
}