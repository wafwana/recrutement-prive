const stats = [
  ["Profil", "À compléter", "Votre présentation professionnelle"],
  ["Candidatures", "0", "Suivi de vos opportunités"],
  ["Documents", "0", "CV et pièces utiles"],
];

export default function CandidatPage() {
  return (
    <section className="mx-auto w-[min(1180px,calc(100%-40px))] py-16 md:w-[min(1180px,calc(100%-72px))] md:py-24">
      <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Espace candidat</p>
      <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-serif text-5xl sm:text-6xl">Votre parcours, en un regard.</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-white/50">Cette première version pose le socle fonctionnel du portail candidat. Les données seront branchées à l’authentification et à Prisma dans le lot dédié.</p>
        </div>
        <div className="border border-white/10 px-5 py-4 text-right text-[10px] uppercase tracking-[0.18em] text-white/45">Session démo</div>
      </div>

      <div className="mt-12 grid gap-px bg-white/10 md:grid-cols-3">
        {stats.map(([label, value, description]) => (
          <div key={label} className="bg-[#111] p-7">
            <span className="text-[10px] uppercase tracking-[0.22em] text-white/40">{label}</span>
            <p className="mt-6 font-serif text-3xl text-[#c7a15a]">{value}</p>
            <p className="mt-3 text-sm text-white/45">{description}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.3fr_.7fr]">
        <section className="border border-white/10 p-8">
          <h2 className="font-serif text-2xl">Prochaines actions</h2>
          <div className="mt-7 space-y-3">
            {[
              "Compléter votre profil professionnel",
              "Ajouter votre CV principal",
              "Indiquer vos préférences de recherche",
            ].map((item, index) => (
              <div key={item} className="flex items-center gap-4 border-b border-white/10 py-4 text-sm text-white/65">
                <span className="text-[#c7a15a]">0{index + 1}</span>
                {item}
              </div>
            ))}
          </div>
        </section>
        <aside className="border border-white/10 bg-[#111] p-8">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Confidentialité</p>
          <p className="mt-6 text-sm leading-7 text-white/50">Vos informations sont destinées à l’accompagnement de vos démarches de recrutement et restent sous votre contrôle.</p>
        </aside>
      </div>
    </section>
  );
}
