import Link from "next/link";

type Match = {
  jobId: string;
  title: string;
  companyName: string;
  location: string | null;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  reasons: string[];
};

export default function CandidateJobMatches({ matches }: { matches: Match[] }) {
  return (
    <section className="mt-10 border border-white/10 bg-[#111] p-7">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Matching candidat</p>
          <h2 className="mt-2 font-serif text-2xl text-white">Les offres qui correspondent à votre profil.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
            Le classement est calculé à partir de votre profil actuel. Vous pouvez ouvrir une offre puis candidater directement.
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-[0.16em] text-white/30">{matches.length} recommandation{matches.length > 1 ? "s" : ""}</span>
      </div>

      {matches.length === 0 ? (
        <div className="mt-6 border border-white/10 p-5 text-sm text-white/40">
          Aucune offre ouverte ne correspond encore suffisamment à votre profil. Complétez votre profil et vos compétences pour améliorer le matching.
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {matches.map((match) => (
            <article key={match.jobId} className="border border-white/10 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <p className="font-serif text-xl text-white">{match.title}</p>
                  <p className="mt-1 text-xs text-white/45">{match.companyName} · {match.location || "Localisation non précisée"}</p>
                  <p className="mt-3 text-xs leading-5 text-white/50">{match.reasons.join(" ")}</p>
                  {match.matchedSkills.length > 0 && (
                    <p className="mt-2 text-xs text-emerald-300/80">Compétences correspondantes : {match.matchedSkills.slice(0, 6).join(", ")}</p>
                  )}
                  {match.missingSkills.length > 0 && (
                    <p className="mt-2 text-xs text-white/30">À renforcer : {match.missingSkills.slice(0, 5).join(", ")}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="min-w-20 border border-[#c7a15a]/30 px-4 py-3 text-center">
                    <p className="font-serif text-2xl text-[#c7a15a]">{match.score}</p>
                    <p className="text-[9px] uppercase tracking-[0.16em] text-white/35">/100</p>
                  </div>
                  <Link
                    href={`/offres/${match.jobId}`}
                    className="border border-[#c7a15a]/50 px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#c7a15a]"
                  >
                    Voir l'offre →
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
