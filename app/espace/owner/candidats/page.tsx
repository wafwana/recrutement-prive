import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function OwnerCandidatesPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "OWNER") redirect("/connexion");

  const candidates = await prisma.user.findMany({
    where: { role: "CANDIDAT", status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      candidat: {
        select: {
          id: true,
          headline: true,
          location: true,
          country: true,
          experienceYears: true,
          primaryCategory: { select: { name: true } },
          documents: {
            select: { id: true, name: true, type: true, createdAt: true },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  return (
    <section className="mx-auto w-[min(1180px,calc(100%-40px))] py-12 md:w-[min(1180px,calc(100%-72px))] md:py-20">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Owner · Candidats</p>
          <h1 className="mt-4 font-serif text-4xl sm:text-5xl">Base candidats.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/50">
            Accédez aux candidats réellement enregistrés comme comptes CANDIDAT et vérifiez leurs documents rattachés.
          </p>
        </div>
        <Link href="/espace/owner" className="border border-white/15 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-white/65 hover:border-[#c7a15a] hover:text-[#c7a15a]">
          ← Retour au cockpit
        </Link>
      </div>

      <div className="mt-10 grid gap-5">
        {candidates.map((candidate) => {
          const profile = candidate.candidat;
          return (
            <article key={candidate.id} className="border border-white/10 bg-[#111] p-7">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#c7a15a]">Candidat</p>
                  <h2 className="mt-2 font-serif text-2xl">{candidate.name || "Nom non renseigné"}</h2>
                  <p className="mt-2 text-sm text-white/45">{candidate.email}</p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">Documents</p>
                  <p className="mt-2 font-serif text-2xl text-[#c7a15a]">{profile?.documents.length ?? 0}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-2 lg:grid-cols-4">
                <div><p className="text-[10px] uppercase tracking-[0.14em] text-white/35">Fonction</p><p className="mt-2 text-sm text-white/70">{profile?.headline || "—"}</p></div>
                <div><p className="text-[10px] uppercase tracking-[0.14em] text-white/35">Localisation</p><p className="mt-2 text-sm text-white/70">{[profile?.location, profile?.country].filter(Boolean).join(", ") || "—"}</p></div>
                <div><p className="text-[10px] uppercase tracking-[0.14em] text-white/35">Expérience</p><p className="mt-2 text-sm text-white/70">{profile?.experienceYears != null ? `${profile.experienceYears} an(s)` : "—"}</p></div>
                <div><p className="text-[10px] uppercase tracking-[0.14em] text-white/35">Catégorie</p><p className="mt-2 text-sm text-white/70">{profile?.primaryCategory?.name && typeof profile.primaryCategory.name === "object" && "fr" in profile.primaryCategory.name ? String((profile.primaryCategory.name as Record<string, unknown>).fr ?? "—") : "—"}</p></div>
              </div>

              <div className="mt-6 border-t border-white/10 pt-5">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">CV / documents rattachés</p>
                {profile?.documents.length ? (
                  <div className="mt-3 space-y-2">
                    {profile.documents.map((doc) => (
                      <div key={doc.id} className="flex flex-col gap-2 border border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-white/75">{doc.name}</p>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/30">{doc.type || "Document"}</p>
                        </div>
                        <Link href={`/api/candidats/documents/${doc.id}`} target="_blank" className="text-[10px] uppercase tracking-[0.15em] text-[#c7a15a] hover:underline">
                          Ouvrir ↗
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-white/40">Aucun CV ou document n’est actuellement rattaché à ce candidat.</p>
                )}
              </div>
            </article>
          );
        })}

        {candidates.length === 0 ? (
          <div className="border border-white/10 bg-[#111] p-8 text-sm text-white/45">
            Aucun compte CANDIDAT actif n’est actuellement enregistré.
          </div>
        ) : null}
      </div>
    </section>
  );
}
