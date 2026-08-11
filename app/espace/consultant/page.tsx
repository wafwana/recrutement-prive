const pipeline = [
  { label: "À qualifier", count: 0 },
  { label: "En recherche", count: 0 },
  { label: "Présentés", count: 0 },
  { label: "Entretiens", count: 0 },
];

const quickLinks = ["Nouveau candidat", "Nouvelle entreprise", "Nouvelle note", "Nouvel événement"];

export default function ConsultantPage() {
  return (
    <section className="mx-auto w-[min(1180px,calc(100%-40px))] py-16 md:w-[min(1180px,calc(100%-72px))] md:py-24">
      <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Espace consultant</p>
      <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-serif text-5xl sm:text-6xl">Le recrutement au centre.</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-white/50">Le socle CRM du Lot 2 prépare le pipeline opérationnel du consultant : candidats, entreprises, missions et étapes de recrutement.</p>
        </div>
        <span className="border border-white/10 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-white/40">Vue générale</span>
      </div>

      <section className="mt-12 border border-white/10 p-6 md:p-8">
        <div className="flex items-center justify-between gap-5">
          <h2 className="font-serif text-2xl">Pipeline recrutement</h2>
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/35">0 opportunité</span>
        </div>
        <div className="mt-8 grid gap-3 md:grid-cols-4">
          {pipeline.map((stage) => (
            <div key={stage.label} className="min-h-36 border border-white/10 bg-[#111] p-5">
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/40">{stage.label}</span>
              <p className="mt-7 font-serif text-3xl text-[#c7a15a]">{stage.count}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_.8fr]">
        <div className="border border-white/10 p-8">
          <h2 className="font-serif text-2xl">Accès rapides</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {quickLinks.map((item) => (
              <button key={item} type="button" className="border border-white/10 p-5 text-left text-sm text-white/60 transition hover:border-[#c7a15a]/50 hover:text-white">
                <span className="text-[#c7a15a]">+</span><span className="ml-3">{item}</span>
              </button>
            ))}
          </div>
        </div>
        <aside className="border border-white/10 bg-[#111] p-8">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Aujourd’hui</p>
          <p className="mt-6 font-serif text-3xl">0 rendez-vous</p>
          <p className="mt-4 text-sm leading-7 text-white/45">L’agenda consultant sera connecté aux événements et aux missions dans le prochain niveau fonctionnel.</p>
        </aside>
      </section>
    </section>
  );
}
