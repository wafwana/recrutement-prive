import Link from "next/link";

const documents = [
  {
    title: "Convention-cadre",
    description: "Cadre complet pour une relation durable avec l’entreprise.",
  },
  {
    title: "Convention simple",
    description: "Version allégée pour une mission ponctuelle.",
  },
  {
    title: "Engagement de l’entreprise",
    description: "Formalisation des éléments essentiels avant activation de la mission.",
  },
  {
    title: "Clauses & annexes",
    description: "Confidentialité, données, responsabilité, rémunération, résiliation et autres clauses selon le contexte.",
  },
];

const checks = [
  "Pays de l’entreprise et de Recrutement Privé",
  "Pays du candidat et lieu d’exécution lorsque pertinents",
  "Loi choisie et juridiction envisagée",
  "Rémunération, devise, facturation et traitement fiscal à vérifier",
  "Protection des données et éventuels transferts internationaux",
];

export default function ConventionsEntreprisePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide opacity-70">Espace entreprise</p>
          <h1 className="mt-2 text-3xl font-semibold">Conventions & cadre contractuel</h1>
          <p className="mt-3 max-w-3xl text-base opacity-80">
            Préparer le bon dossier contractuel selon la mission et le contexte national, sans
            considérer qu’une loi étrangère ou française s’applique automatiquement.
          </p>
        </div>
        <Link href="/espace/entreprise" className="rounded-lg border px-4 py-2 text-sm">
          Retour à l’espace entreprise
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        {documents.map((document) => (
          <article key={document.title} className="rounded-2xl border p-6 shadow-sm">
            <h2 className="text-xl font-semibold">{document.title}</h2>
            <p className="mt-2 opacity-75">{document.description}</p>
            <div className="mt-5 text-sm opacity-60">Modèle à générer selon le dossier contractuel.</div>
          </article>
        ))}
      </section>

      <section className="mt-8 rounded-2xl border p-6">
        <h2 className="text-xl font-semibold">Analyse internationale avant signature</h2>
        <p className="mt-2 max-w-3xl opacity-75">
          Lorsque plusieurs pays sont concernés, la plateforme doit distinguer la loi applicable,
          la juridiction, les règles impératives, la fiscalité et la protection des données.
        </p>
        <ul className="mt-5 grid gap-3 md:grid-cols-2">
          {checks.map((check) => (
            <li key={check} className="rounded-xl bg-black/[0.03] px-4 py-3 text-sm">
              {check}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 rounded-2xl border border-dashed p-6">
        <h2 className="text-lg font-semibold">Validation requise</h2>
        <p className="mt-2 text-sm opacity-75">
          Le système prépare et structure le dossier. Les modèles destinés à être signés doivent
          être validés juridiquement dans les juridictions concernées, et les traitements fiscaux
          ou comptables sensibles doivent être validés par le conseil compétent.
        </p>
      </section>
    </main>
  );
}
