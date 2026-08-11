const metrics = [
  ["Recrutements actifs", "0"],
  ["Profils proposés", "0"],
  ["Entretiens à venir", "0"],
];

const actions = ["Créer une nouvelle mission", "Consulter les profils proposés", "Préparer un brief de recrutement"];

export default function EntreprisePage() {
  return (
    <section className="mx-auto w-[min(1180px,calc(100%-40px))] py-16 md:w-[min(1180px,calc(100%-72px))] md:py-24">
      <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Espace entreprise</p>
      <h1 className="mt-5 font-serif text-5xl sm:text-6xl">Vos recrutements, clairement pilotés.</h1>
      <p className="mt-5 max-w-2xl text-sm leading-7 text-white/50">Le tableau de bord centralise les missions et prépare le socle du suivi entreprise. Les données réelles seront alimentées par Prisma et l’authentification dans les lots backend.</p>

      <div className="mt-12 grid gap-px bg-white/10 md:grid-cols-3">
        {metrics.map(([label, value]) => (
          <div key={label} className="bg-[#111] p-7">
            <span className="text-[10px] uppercase tracking-[0.22em] text-white/40">{label}</span>
            <p className="mt-6 font-serif text-4xl">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_.72fr]">
        <section className="border border-white/10 p-8">
          <div className="flex items-center justify-between gap-6">
            <h2 className="font-serif text-2xl">Actions prioritaires</h2>
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/35">Aujourd’hui</span>
          </div>
          <div className="mt-6 space-y-2">
            {actions.map((action, index) => (
              <button key={action} type="button" className="flex w-full items-center gap-4 border border-white/10 p-5 text-left text-sm text-white/65 transition hover:border-[#c7a15a]/50 hover:text-white">
                <span className="text-[#c7a15a]">0{index + 1}</span>
                {action}
                <span className="ml-auto text-white/30">→</span>
              </button>
            ))}
          </div>
        </section>
        <aside className="border border-[#c7a15a]/25 bg-[#111] p-8">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Qualité du brief</p>
          <p className="mt-6 font-serif text-3xl">Prêt à 0%</p>
          <p className="mt-4 text-sm leading-7 text-white/45">Un brief précis améliore la recherche, la présélection et la qualité des échanges avec nos consultants.</p>
        </aside>
      </div>
    </section>
  );
}
