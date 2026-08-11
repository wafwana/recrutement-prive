const services = [
  { title: "Recrutement stratégique", text: "Des profils sélectionnés avec exigence, en accord avec votre culture et vos ambitions." },
  { title: "Approche confidentielle", text: "Une relation discrète et personnalisée pour les missions à fort enjeu." },
  { title: "Expertise humaine + IA", text: "La technologie accélère l’analyse. La décision reste profondément humaine." },
];

export default function HomePage() {
  return (
    <main className="rp-shell">
      <header className="border-b border-white/10">
        <div className="rp-container flex h-20 items-center justify-between">
          <a href="#accueil" className="flex items-center gap-3" aria-label="Recrutement Privé - accueil">
            <span className="rp-serif text-2xl tracking-[0.2em]">RP</span>
            <span className="hidden text-[10px] uppercase tracking-[0.34em] text-white/60 sm:block">Recrutement Privé</span>
          </a>
          <nav className="hidden items-center gap-8 text-[11px] uppercase tracking-[0.2em] text-white/70 md:flex">
            <a href="#cabinet" className="transition hover:text-white">Le cabinet</a>
            <a href="#entreprises" className="transition hover:text-white">Entreprises</a>
            <a href="#candidats" className="transition hover:text-white">Candidats</a>
            <a href="#contact" className="transition hover:text-white">Contact</a>
          </nav>
          <a href="#contact" className="border border-[var(--rp-gold)] px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-[var(--rp-gold)] transition hover:bg-[var(--rp-gold)] hover:text-black">
            Échanger
          </a>
        </div>
      </header>

      <section id="accueil" className="border-b border-white/10">
        <div className="rp-container grid min-h-[680px] items-center gap-14 py-20 md:grid-cols-[1.05fr_.95fr] md:py-24">
          <div>
            <p className="mb-6 text-[10px] uppercase tracking-[0.38em] text-[var(--rp-gold)]">Cabinet de recrutement</p>
            <h1 className="rp-serif max-w-3xl text-5xl leading-[1.05] sm:text-6xl lg:text-7xl">
              Les bonnes rencontres créent les <span className="rp-gold italic">grandes trajectoires.</span>
            </h1>
            <p className="mt-8 max-w-xl text-base leading-8 text-white/60 sm:text-lg">
              Recrutement Privé accompagne les entreprises et les talents dans des recrutements exigeants, confidentiels et durables.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <a href="#entreprises" className="bg-[var(--rp-gold)] px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-black transition hover:opacity-90">Je recrute</a>
              <a href="#candidats" className="border border-white/20 px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white transition hover:border-white/50">Je suis candidat</a>
            </div>
          </div>

          <div className="relative min-h-[420px] overflow-hidden border border-white/10 bg-gradient-to-br from-white/[0.08] via-transparent to-[var(--rp-gold)]/10">
            <div className="absolute inset-7 border border-[var(--rp-gold)]/35" />
            <div className="absolute inset-x-10 bottom-10">
              <div className="mb-5 h-px w-20 bg-[var(--rp-gold)]" />
              <p className="rp-serif text-3xl leading-tight">Une approche sélective. Une attention sur mesure.</p>
              <p className="mt-3 max-w-md text-sm leading-6 text-white/50">Chaque mandat mérite une recherche précise, un dialogue direct et une sélection pensée pour le long terme.</p>
            </div>
            <div className="absolute right-10 top-10 text-[70px] leading-none text-white/[0.05]">RP</div>
          </div>
        </div>
      </section>

      <section id="cabinet" className="border-b border-white/10 py-24">
        <div className="rp-container grid gap-12 md:grid-cols-[.7fr_1.3fr]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-[var(--rp-gold)]">Notre signature</p>
            <h2 className="rp-serif mt-4 text-4xl sm:text-5xl">L’exigence sans distance.</h2>
          </div>
          <div className="max-w-2xl text-base leading-8 text-white/60">
            <p>Recrutement Privé privilégie la qualité des échanges, la compréhension fine des enjeux et la présentation de profils réellement pertinents.</p>
            <p className="mt-5">Nous utilisons les meilleurs outils pour gagner en précision, sans jamais remplacer le jugement du consultant ni la singularité d’une rencontre.</p>
          </div>
        </div>
      </section>

      <section id="entreprises" className="border-b border-white/10 bg-[#111]/80 py-24">
        <div className="rp-container">
          <div className="mb-12 max-w-2xl">
            <p className="text-[10px] uppercase tracking-[0.35em] text-[var(--rp-gold)]">Entreprises</p>
            <h2 className="rp-serif mt-4 text-4xl sm:text-5xl">Recruter juste, pas seulement vite.</h2>
          </div>
          <div className="grid gap-px bg-white/10 md:grid-cols-3">
            {services.map((service) => (
              <article key={service.title} className="bg-[#111] p-8">
                <span className="text-xs text-[var(--rp-gold)]">0{services.indexOf(service) + 1}</span>
                <h3 className="rp-serif mt-8 text-2xl">{service.title}</h3>
                <p className="mt-4 text-sm leading-7 text-white/50">{service.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="candidats" className="border-b border-white/10 py-24">
        <div className="rp-container grid items-end gap-10 md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-[var(--rp-gold)]">Candidats</p>
            <h2 className="rp-serif mt-4 max-w-3xl text-4xl sm:text-5xl">Votre parcours mérite une opportunité à sa hauteur.</h2>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/60">Présentez votre projet professionnel. Notre équipe vous accompagne avec confidentialité et vous met en relation avec des environnements réellement alignés avec votre profil.</p>
          </div>
          <a href="#contact" className="border-b border-[var(--rp-gold)] pb-2 text-[10px] uppercase tracking-[0.25em] text-[var(--rp-gold)]">Déposer mon profil →</a>
        </div>
      </section>

      <section id="contact" className="py-24">
        <div className="rp-container grid gap-12 md:grid-cols-[1fr_.8fr]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-[var(--rp-gold)]">Contact</p>
            <h2 className="rp-serif mt-4 text-4xl sm:text-5xl">Parlons de votre prochain recrutement.</h2>
          </div>
          <div className="border border-white/10 p-8">
            <p className="text-sm leading-7 text-white/60">Une première conversation suffit pour comprendre votre besoin et déterminer la meilleure approche.</p>
            <a href="mailto:contact@recrutement-prive.fr" className="mt-7 inline-block text-sm text-[var(--rp-gold)]">contact@recrutement-prive.fr</a>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8">
        <div className="rp-container flex flex-col gap-3 text-[10px] uppercase tracking-[0.2em] text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Recrutement Privé</span>
          <span>Confidentiel · Humain · Exigeant</span>
        </div>
      </footer>
    </main>
  );
}
