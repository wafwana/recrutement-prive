import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { RP_TAXONOMY } from "@/lib/taxonomy/rp-taxonomy";
import { buildProfessionRoot } from "@/lib/cv/folders";
import { ensureTaxonomySynced } from "@/lib/taxonomy/sync";
import { getStrongProfilesForProfession } from "@/lib/taxonomy/strong-profiles";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function keepQuery(sector: string, profession: string, q: string, dossier: string) {
  const params = new URLSearchParams();
  if (sector) params.set("sector", sector);
  if (profession) params.set("profession", profession);
  if (q) params.set("q", q);
  if (dossier) params.set("dossier", dossier);
  const value = params.toString();
  return value ? `/espace/owner/metiers?${value}` : "/espace/owner/metiers";
}

export default async function OwnerMetiersPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "OWNER") redirect("/connexion");

  const params = await searchParams;
  await ensureTaxonomySynced();

  const selectedSector = one(params.sector) || "";
  const selectedProfession = one(params.profession) || "";
  const query = (one(params.q) || "").trim().toLowerCase();
  const dossierFilter = one(params.dossier) || "all";

  const documents = await prisma.cvIntake.findMany({
    orderBy: { createdAt: "desc" },
    take: 5000,
    select: {
      id: true,
      name: true,
      candidateName: true,
      candidateEmail: true,
      folderPath: true,
      status: true,
      createdAt: true,
    },
  });

  const professionFolders = RP_TAXONOMY.flatMap((sector) =>
    sector.subcategories.map((profession) => ({
      sectorCode: sector.code,
      sectorName: sector.name.fr,
      professionCode: profession.code,
      professionName: profession.name.fr,
      root: buildProfessionRoot(sector.code, profession.code),
    })),
  );

  const selected = professionFolders.find(
    (item) => item.sectorCode === selectedSector && item.professionCode === selectedProfession,
  );

  const selectedDocuments = selected
    ? documents.filter(
        (document) =>
          document.folderPath === selected.root ||
          document.folderPath.startsWith(selected.root + "/"),
      )
    : [];

  const counts = new Map<string, number>();
  for (const document of documents) {
    const match = professionFolders.find(
      (item) =>
        document.folderPath === item.root ||
        document.folderPath.startsWith(item.root + "/"),
    );
    if (match) counts.set(match.root, (counts.get(match.root) || 0) + 1);
  }

  const totalProfessions = professionFolders.length;
  const filledProfessions = professionFolders.filter(
    (item) => (counts.get(item.root) || 0) > 0,
  ).length;
  const totalCv = documents.length;

  const visibleSectors = RP_TAXONOMY.map((sector) => ({
    sector,
    professions: sector.subcategories.filter((profession) => {
      const root = buildProfessionRoot(sector.code, profession.code);
      const count = counts.get(root) || 0;
      const matchesQuery =
        !query ||
        sector.name.fr.toLowerCase().includes(query) ||
        profession.name.fr.toLowerCase().includes(query) ||
        profession.code.toLowerCase().includes(query) ||
        getStrongProfilesForProfession(sector.code, profession.code).some((profile) =>
          profile.title.toLowerCase().includes(query),
        );
      const matchesSector = !selectedSector || selectedSector === sector.code;
      const matchesDossier =
        dossierFilter === "all" ||
        (dossierFilter === "filled" && count > 0) ||
        (dossierFilter === "empty" && count === 0);
      return matchesQuery && matchesSector && matchesDossier;
    }),
  })).filter((item) => item.professions.length > 0);

  return (
    <section className="mx-auto w-[min(1380px,calc(100%-32px))] py-10 md:w-[min(1380px,calc(100%-72px))] md:py-16">
      <div className="flex flex-col gap-5 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">
            OWNER · MÉTIERS & DOSSIERS
          </p>
          <h1 className="mt-3 font-serif text-4xl text-white md:text-5xl">
            Métiers & dossiers
          </h1>
          <p className="mt-4 max-w-5xl text-sm leading-7 text-white/50">
            Le vivier métier de Recrutement Privé : chaque secteur, chaque métier dérivé et
            chaque dossier restent disponibles, y compris lorsqu&apos;aucun CV n&apos;y est encore
            rattaché. Les profils forts demandés servent à repérer les recherches à forte
            valeur, sans exclure les autres profils.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/espace/owner/cv-intake"
            className="border border-[#F97316]/60 bg-[#F97316]/10 px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-[#F97316]"
          >
            Intégrer un CV
          </Link>
          <Link
            href="/espace/owner"
            className="border border-white/15 px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-white/65"
          >
            Retour Owner
          </Link>
        </div>
      </div>

      <div className="mt-7 grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-[#111] p-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Métiers / dérivés</p>
          <p className="mt-3 font-serif text-3xl text-[#c7a15a]">{totalProfessions}</p>
          <p className="mt-1 text-[10px] text-white/30">Taxonomie synchronisée</p>
        </div>
        <div className="bg-[#111] p-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Dossiers alimentés</p>
          <p className="mt-3 font-serif text-3xl text-emerald-300">{filledProfessions}</p>
          <p className="mt-1 text-[10px] text-white/30">Avec au moins un CV</p>
        </div>
        <div className="bg-[#111] p-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Dossiers vides</p>
          <p className="mt-3 font-serif text-3xl text-white/70">
            {totalProfessions - filledProfessions}
          </p>
          <p className="mt-1 text-[10px] text-white/30">Conservés et disponibles</p>
        </div>
        <div className="bg-[#111] p-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">CV dans le vivier</p>
          <p className="mt-3 font-serif text-3xl text-[#F97316]">{totalCv}</p>
          <p className="mt-1 text-[10px] text-white/30">Jusqu&apos;à 5 000 derniers dossiers affichés</p>
        </div>
      </div>

      <form
        method="get"
        className="mt-7 border border-white/10 bg-[#111] p-5"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px_auto]">
          <label className="block">
            <span className="text-[9px] uppercase tracking-[0.16em] text-white/35">
              Rechercher un métier, code ou profil fort
            </span>
            <input
              name="q"
              defaultValue={one(params.q) || ""}
              placeholder="Ex. cybersécurité, manager, ingénieur..."
              className="mt-2 h-11 w-full border border-white/10 bg-[#0b0b0b] px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#c7a15a]/60"
            />
          </label>
          <label className="block">
            <span className="text-[9px] uppercase tracking-[0.16em] text-white/35">Secteur</span>
            <select
              name="sector"
              defaultValue={selectedSector}
              className="mt-2 h-11 w-full border border-white/10 bg-[#0b0b0b] px-3 text-xs text-white outline-none focus:border-[#c7a15a]/60"
            >
              <option value="">Tous les secteurs</option>
              {RP_TAXONOMY.map((sector) => (
                <option key={sector.code} value={sector.code}>
                  {sector.name.fr}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[9px] uppercase tracking-[0.16em] text-white/35">Dossiers</span>
            <select
              name="dossier"
              defaultValue={dossierFilter}
              className="mt-2 h-11 w-full border border-white/10 bg-[#0b0b0b] px-3 text-xs text-white outline-none focus:border-[#c7a15a]/60"
            >
              <option value="all">Tous</option>
              <option value="filled">Alimentés</option>
              <option value="empty">Vides</option>
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="h-11 border border-[#c7a15a] bg-[#c7a15a]/10 px-5 text-[10px] uppercase tracking-[0.16em] text-[#c7a15a]"
            >
              Filtrer
            </button>
            <Link
              href="/espace/owner/metiers"
              className="flex h-11 items-center border border-white/10 px-4 text-[10px] uppercase tracking-[0.16em] text-white/45"
            >
              Réinitialiser
            </Link>
          </div>
        </div>
      </form>

      {selected ? (
        <section className="mt-8 border border-[#c7a15a]/40 bg-[#111] p-6 md:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#c7a15a]">
                Dossier métier · {selected.sectorName}
              </p>
              <h2 className="mt-2 font-serif text-3xl text-white">{selected.professionName}</h2>
              <p className="mt-2 text-xs font-mono text-white/30">{selected.root}</p>
              <div className="mt-5">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[#F97316]">
                    Profils forts demandés
                  </p>
                  <span className="text-[10px] text-white/30">
                    {selectedDocuments.length} CV dans ce dossier
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {getStrongProfilesForProfession(selectedSector, selectedProfession).map(
                    (profile) => (
                      <span
                        key={profile.title}
                        className="border border-[#F97316]/30 bg-[#F97316]/5 px-3 py-2 text-[10px] text-white/75"
                      >
                        {profile.title}
                      </span>
                    ),
                  )}
                </div>
              </div>
            </div>
            <Link
              href={keepQuery("", "", query, dossierFilter)}
              className="border border-white/15 px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-white/60"
            >
              Fermer le dossier
            </Link>
          </div>

          <div className="mt-7 space-y-3">
            {selectedDocuments.map((document) => (
              <article
                key={document.id}
                className="flex flex-col gap-3 border border-white/10 bg-[#0b0b0b] p-5 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-white/80">{document.name}</p>
                  <p className="mt-1 truncate text-xs text-white/45">
                    {document.candidateName || "Candidat non renseigné"}
                    {document.candidateEmail ? " · " + document.candidateEmail : ""}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/30">
                    {document.status} · {new Date(document.createdAt).toLocaleString("fr-FR")}
                  </p>
                </div>
                <a
                  href={"/api/owner/cv-intake/" + document.id + "/original"}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 border border-[#c7a15a] px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-[#c7a15a]"
                >
                  Ouvrir le CV ↗
                </a>
              </article>
            ))}
            {selectedDocuments.length === 0 && (
              <div className="border border-dashed border-white/15 bg-[#0b0b0b] px-6 py-10 text-center">
                <p className="text-sm text-white/60">Dossier actuellement vide.</p>
                <p className="mt-2 text-xs text-white/30">
                  Le dossier existe déjà et reste disponible pour recevoir de nouveaux CV.
                </p>
                <Link
                  href="/espace/owner/cv-intake"
                  className="mt-5 inline-block border border-[#F97316] px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-[#F97316]"
                >
                  Intégrer un CV
                </Link>
              </div>
            )}
          </div>
        </section>
      ) : null}

      <div className="mt-8 space-y-7">
        {visibleSectors.map(({ sector, professions }) => {
          const sectorCvCount = professions.reduce(
            (sum, profession) =>
              sum + (counts.get(buildProfessionRoot(sector.code, profession.code)) || 0),
            0,
          );
          return (
            <section key={sector.code} className="border border-white/10 bg-[#111] p-5 md:p-6">
              <div className="flex flex-col gap-3 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[#c7a15a]">
                    SECTEUR
                  </p>
                  <h2 className="mt-2 font-serif text-2xl text-white">{sector.name.fr}</h2>
                  <p className="mt-1 text-xs text-white/30">{sector.positioning.fr}</p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                    {professions.length} métier{professions.length > 1 ? "s" : ""} affiché
                    {professions.length > 1 ? "s" : ""}
                  </p>
                  <p className="mt-1 text-[10px] text-[#F97316]">
                    {sectorCvCount} CV dans les dossiers visibles
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {professions.map((profession) => {
                  const root = buildProfessionRoot(sector.code, profession.code);
                  const count = counts.get(root) || 0;
                  const isSelected = selected?.root === root;
                  const profiles = getStrongProfilesForProfession(sector.code, profession.code);

                  return (
                    <Link
                      key={profession.code}
                      href={keepQuery(
                        sector.code,
                        profession.code,
                        query,
                        dossierFilter,
                      )}
                      className={
                        "group border p-5 transition " +
                        (isSelected
                          ? "border-[#c7a15a] bg-[#c7a15a]/10"
                          : "border-white/10 bg-[#0b0b0b] hover:border-[#c7a15a]/40 hover:bg-[#0f0f0f]")
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm text-white/85">{profession.name.fr}</p>
                          <p className="mt-2 text-[10px] font-mono text-white/25">
                            {profession.code}
                          </p>
                        </div>
                        <span
                          className={
                            "shrink-0 px-2 py-1 text-[9px] uppercase tracking-[0.12em] " +
                            (count
                              ? "bg-emerald-500/10 text-emerald-300"
                              : "bg-white/5 text-white/30")
                          }
                        >
                          {count} CV
                        </span>
                      </div>

                      <div className="mt-4 border-t border-white/5 pt-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[9px] uppercase tracking-[0.14em] text-[#F97316]">
                            Profils forts demandés
                          </p>
                          <span className="text-[9px] text-white/25">{profiles.length} profils</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {profiles.map((profile) => (
                            <span
                              key={profile.title}
                              className="border border-white/10 bg-white/[0.03] px-2 py-1 text-[9px] leading-4 text-white/60"
                            >
                              {profile.title}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-5 flex items-center justify-between gap-3">
                        <span
                          className={
                            "text-[10px] uppercase tracking-[0.14em] " +
                            (count ? "text-[#c7a15a]" : "text-white/35")
                          }
                        >
                          {count ? "Ouvrir le dossier →" : "Dossier disponible →"}
                        </span>
                        <span className="text-[9px] uppercase tracking-[0.12em] text-white/20">
                          {count ? "alimenté" : "vide"}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}

        {visibleSectors.length === 0 && (
          <div className="border border-dashed border-white/15 bg-[#111] px-6 py-14 text-center">
            <p className="font-serif text-2xl text-white">Aucun métier ne correspond aux filtres.</p>
            <p className="mt-2 text-sm text-white/35">
              La taxonomie et les dossiers existants restent inchangés.
            </p>
            <Link
              href="/espace/owner/metiers"
              className="mt-5 inline-block border border-[#c7a15a] px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-[#c7a15a]"
            >
              Afficher tous les métiers
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
