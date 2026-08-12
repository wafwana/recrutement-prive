const services = [
  { title: "Recrutement stratégique", text: "Des profils sélectionnés avec exigence, en accord avec votre culture et vos ambitions." },
  { title: "Approche confidentielle", text: "Une relation discrète et personnalisée pour les missions à fort enjeu." },
  { title: "Expertise humaine + IA", text: "La technologie accélère l’analyse. La décision reste profondément humaine." },
];

const visualNeeds = [
  { label: "Portrait professionnel", detail: "Hero accueil" },
  { label: "Le cabinet", detail: "Photo du cabinet" },
  { label: "Entreprises", detail: "Visuel métier" },
  { label: "Notre technologie", detail: "Visuel IA" },
];

export default function HomePage() {
  return (
    <main className="rp-shell">
      <header className="border-b rp-border sticky top-0 z-20 bg-[#081625]/95 backdrop-blur">
        <div className="rp-container flex h-20 items-center justify-between gap-6">
          <a href="#accueil" className="flex items-center gap-3" aria-label="Recrutement Privé - accueil">
            <span className="rp-serif text-2xl tracking-[0.2em] text-[var(--rp-orange)]">RP</span>
            <span className="hidden text-[10px] uppercase tracking-[0.34em] text-[#e5e7eb] sm:block">Recrutement Privé</span>
          </a>
          <nav className="hidden items-center gap-8 text-[11px] uppercase tracking-[0.2em] text-[#e5e7eb] md:flex">
            <a href="#cabinet" className="transition hover:text-[var(--rp-orange)]">Le cabinet</a>
            <a href="#entreprises" className="transition hover:text-[var(--rp-orange)]">Entreprises</a>
            <a href="#candidats" className="transition hover:text-[var(--rp-orange)]">Candidats</a>
            <a href="#technologie" className="transition hover:text-[var(--rp-orange)]">Notre technologie</a>
            <a href="#contact" className="transition hover:text-[var(--rp-orange)]">Contact</a>
          </nav>
          <a href="#contact" className="border border-[var(--rp-orange)] px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-[var(--rp-orange)] transition hover:bg-[var(--rp-orange)] hover:text-white">
            Échanger
          </a>
        </div>
      </header>

      <section id="accueil" className="border-b rp-border">
        <div className="rp-container grid min-h-[720px] items-center gap-12 py-16 md:grid-cols-[1fr_.9fr] md:gap-16 md:py-24">
          <div>
            <p className="mb-6 text-[10px] uppercase tracking-[0.38em] text-[var(--rp-orange)]">Cabinet de recrutement</p>
            <h1 className="rp-serif max-w-3xl text-5xl leading-[1.04] sm:text-6xl lg:text-7xl">
              Les bonnes rencontres créent les <span className="rp-orange italic">grandes trajectoires.</span>
            </h1>
            <p className="mt-8 max-w-xl text-base leading-8 text-[#e5e7eb]/80 sm:text-lg">
              Recrutement Privé accompagne les entreprises et les talents dans des recrutements exigeants, confidentiels et durables.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <a href="#entreprises" className="bg-[var(--rp-orange)] px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white transition hover:bg-[var(--rp-orange-bright)]">Je recrute</a>
              <a href="#candidats" className="border border-[#e5e7eb]/25 px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f8fafc] transition hover:border-[var(--rp-orange)] hover:text-[var(--rp-orange)]">Je suis candidat</a>
            </div>
          </div>

          <div className="rp-photo min-h-[500px] md:min-h-[600px]">
            <div className="absolute inset-0 flex items-center justify-center border border-[var(--rp-orange)]/30">
              <div className="max-w-xs px-8 text-center">
                <p className="text-[10px] uppercase tracking-[0.32em] text-[var(--rp-orange)]">Visuel validé attendu</p>
                <h2 className="rp-serif mt-4 text-3xl text-[#f8fafc]">Portrait professionnel</h2>
                <p className="mt-4 text-sm leading-6 text-[#e5e7eb]/70">Aucun portrait original n’a été retrouvé dans l’historique Git accessible. Aucun placeholder générique n’est affiché à sa place.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="cabinet" className="border-b rp-border py-20 md:py-24">
        <div className="rp-container grid gap-12 md:grid-cols-[.8fr_1.2fr] md:items-center">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-[var(--rp-orange)]">Notre signature</p>
            <h2 className="rp-serif mt-4 text-4xl sm:text-5xl">L’exigence sans distance.</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-[.9fr_1.1fr]">
            <div className="rp-photo min-h-[280px] flex items-end p-6">
              <div className="relative z-[1]">
                <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--rp-orange)]">Visuel validé attendu</p>
                <p className="mt-2 text-sm text-[#f8fafc]">Photo du cabinet</p>
              </div>
            </div>
            <div className="max-w-2xl text-base leading-8 text-[#e5e7eb]/80">
              <p>Recrutement Privé privilégie la qualité des échanges, la compréhension fine des enjeux et la présentation de profils réellement pertinents.</p>
              <p className="mt-5">Nous utilisons les meilleurs outils pour gagner en précision, sans jamais remplacer le jugement du consultant ni la singularité d’une rencontre.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="entreprises" className="border-b rp-border bg-[var(--rp-navy-soft)] py-20 md:py-24">
        <div className="rp-container">
          <div className="mb-12 max-w-2xl">
            <p className="text-[10px] uppercase tracking-[0.35em] text-[var(--rp-orange)]">Entreprises</p>
            <h2 className="rp-serif mt-4 text-4xl sm:text-5xl">Recruter juste, pas seulement vite.</h2>
            <p className="mt-5 text-base leading-8 text-[#e5e7eb]/75">Une sélection précise, une relation directe et une exigence constante du brief jusqu’à l’intégration.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-[.85fr_1.15fr]">
            <div className="rp-photo min-h-[360px] flex items-end p-7">
              <div className="relative z-[1]">
                <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--rp-orange)]">Visuel validé attendu</p>
                <p className="mt-2 text-sm text-[#f8fafc]">Photo Entreprises</p>
              </div>
            </div>
            <div className="grid gap-px bg-[var(--rp-border)] md:grid-cols-3">
              {services.map((service, index) => (
                <article key={service.title} className="bg-[var(--rp-navy)] p-8">
                  <span className="text-xs font-semibold text-[var(--rp-orange)]">0{index + 1}</span>
                  <h3 className="rp-serif mt-8 text-2xl">{service.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-[#e5e7eb]/70">{service.text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="candidats" className="border-b rp-border py-20 md:py-24">
        <div className="rp-container grid items-end gap-10 md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-[var(--rp-orange)]">Candidats</p>
            <h2 className="rp-serif mt-4 max-w-3xl text-4xl sm:text-5xl">Votre parcours mérite une opportunité à sa hauteur.</h2>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#e5e7eb]/80">Présentez votre projet professionnel. Notre équipe vous accompagne avec confidentialité et vous met en relation avec des environnements réellement alignés avec votre profil.</p>
          </div>
          <a href="#contact" className="border-b border-[var(--rp-orange)] pb-2 text-[10px] uppercase tracking-[0.25em] text-[var(--rp-orange)]">Déposer mon profil →</a>
        </div>
      </section>

      <section id="technologie" className="border-b rp-border bg-[var(--rp-navy-soft)] py-20 md:py-24">
        <div className="rp-container grid gap-10 md:grid-cols-[1fr_.8fr] md:items-center">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-[var(--rp-orange)]">Notre technologie</p>
            <h2 className="rp-serif mt-4 max-w-2xl text-4xl sm:text-5xl">L’IA accélère l’analyse. L’humain garde la décision.</h2>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#e5e7eb]/80">Nous combinons recherche augmentée, analyse de données et jugement métier pour réduire le bruit et concentrer l’échange sur les profils pertinents.</p>
          </div>
          <div className="rp-photo min-h-[320px] flex items-end p-7">
            <div className="relative z-[1]">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--rp-orange)]">Visuel validé attendu</p>
              <p className="mt-2 text-sm text-[#f8fafc]">Visuel Notre technologie / IA</p>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="py-20 md:py-24">
        <div className="rp-container grid gap-10 md:grid-cols-[.9fr_1.1fr] md:items-center">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-[var(--rp-orange)]">Contact</p>
            <h2 className="rp-serif mt-4 text-4xl sm:text-5xl">Parlons de votre prochain recrutement.</h2>
            <p className="mt-6 max-w-xl text-base leading-8 text-[#e5e7eb]/80">Une première conversation suffit pour comprendre votre besoin et déterminer la meilleure approche.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-[.8fr_1.2fr]">
            <div className="rp-photo min-h-[300px] flex items-end p-7">
              <div className="relative z-[1]">
                <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--rp-orange)]">Visuel validé attendu</p>
                <p className="mt-2 text-sm text-[#f8fafc]">Visuel / carte de Contact</p>
              </div>
            </div>
            <div className="border rp-border bg-[var(--rp-navy-soft)] p-8">
              <p className="text-sm leading-7 text-[#e5e7eb]/75">Une première conversation suffit pour comprendre votre besoin et déterminer la meilleure approche.</p>
              <a href="mailto:contact@recrutement-prive.fr" className="mt-7 inline-block text-sm font-semibold text-[var(--rp-orange)]">contact@recrutement-prive.fr</a>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t rp-border py-10">
        <div className="rp-container">
          <div className="mb-6 flex flex-wrap gap-2 text-[9px] uppercase tracking-[0.24em] text-[#e5e7eb]/60">
            <span className="rounded-full border rp-border px-3 py-1">Référence maquette</span>
            <span className="rounded-full border rp-border px-3 py-1">Palette navy / orange</span>
            <span className="rounded-full border rp-border px-3 py-1">Assets à restaurer</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {visualNeeds.map((visual) => (
              <div key={visual.label} className="border rp-border bg-[var(--rp-navy-soft)] p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--rp-orange)]">{visual.label}</p>
                <p className="mt-2 text-sm text-[#e5e7eb]/65">{visual.detail}</p>
                <p className="mt-4 text-[10px] uppercase tracking-[0.18em] text-[#e5e7eb]/40">Asset original introuvable dans Git</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t rp-border py-8">
        <div className="rp-container flex flex-col gap-3 text-[10px] uppercase tracking-[0.2em] text-[#e5e7eb]/40 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Recrutement Privé</span>
          <span>Confidentiel · Humain · Exigeant</span>
        </div>
      </footer>
    </main>
  );
}
