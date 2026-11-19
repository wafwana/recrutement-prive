import Link from "next/link";

const sections = [
  {
    title: "1. Qui traite vos données ?",
    body: (
      <p>
        Le service Recrutement Privé est l’éditeur du présent site et organise les traitements
        nécessaires à son fonctionnement. Pour toute question ou demande relative à vos données,
        vous pouvez écrire à <a className="text-[#f97316] underline" href="mailto:contact@recrutement-prive.com">contact@recrutement-prive.com</a>.
        Les coordonnées juridiques complètes de l’éditeur sont à consulter dans les mentions légales.
      </p>
    ),
  },
  {
    title: "2. Quelles données peuvent être collectées ?",
    body: (
      <>
        <p>Selon votre utilisation du service, les données peuvent comprendre :</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>identité, adresse e-mail, téléphone et pays de résidence ;</li>
          <li>pour les entreprises : raison sociale, identité du représentant, coordonnées professionnelles, adresse, site web et informations d’identification de l’entreprise (dont SIREN, SIRET, forme juridique et code APE lorsqu’ils sont fournis ou issus d’une source publique) ;</li>
          <li>pour les candidats : CV, parcours, compétences, expériences, qualifications, candidatures et informations communiquées dans l’espace candidat ;</li>
          <li>échanges avec le service, demandes d’assistance et informations nécessaires à la sécurité et au bon fonctionnement du compte.</li>
        </ul>
        <p>Ne transmettez pas de données sensibles qui ne seraient pas nécessaires à votre démarche.</p>
      </>
    ),
  },
  {
    title: "3. Pourquoi ces données sont-elles utilisées ?",
    body: (
      <ul className="list-disc space-y-2 pl-6">
        <li>créer, sécuriser et administrer les comptes candidats et entreprises ;</li>
        <li>permettre le dépôt et la gestion des CV, candidatures, offres et missions de recrutement ;</li>
        <li>analyser les compétences et rapprocher les profils des besoins de recrutement ;</li>
        <li>permettre les mises en relation et le suivi des échanges lorsque cela est prévu par le service ;</li>
        <li>répondre aux demandes, assurer le support, prévenir les abus et protéger la plateforme ;</li>
        <li>respecter les obligations légales applicables et établir, exercer ou défendre des droits.</li>
      </ul>
    ),
  },
  {
    title: "4. Fondements du traitement",
    body: (
      <p>
        Selon le traitement concerné, les données sont utilisées pour fournir le service demandé
        ou prendre des mesures précontractuelles, respecter une obligation légale, ou poursuivre
        un intérêt légitime tel que la sécurisation du service et la mise en relation professionnelle.
        Lorsqu’un traitement repose sur votre consentement, celui-ci peut être retiré à tout moment
        pour l’avenir.
      </p>
    ),
  },
  {
    title: "5. Qui peut accéder aux données ?",
    body: (
      <p>
        Les données sont accessibles aux seules personnes habilitées qui en ont besoin pour leurs
        fonctions. Certaines informations de candidature peuvent être communiquées à une entreprise
        dans le cadre d’une mise en relation ou d’une candidature, selon les fonctionnalités utilisées
        et les autorisations applicables. Des prestataires techniques peuvent intervenir pour
        l’hébergement, la maintenance, la sécurité ou l’envoi de communications, dans la limite de
        leurs missions et des garanties contractuelles applicables. Les données ne sont pas destinées
        à être rendues publiques.
      </p>
    ),
  },
  {
    title: "6. Durée de conservation",
    body: (
      <p>
        Les données sont conservées pendant une durée limitée, nécessaire à la finalité poursuivie.
        Cette durée dépend notamment de la vie du compte, du suivi des candidatures et missions,
        des obligations légales applicables et des délais nécessaires à la gestion d’éventuels
        différends. Lorsqu’elles ne sont plus nécessaires, les données sont supprimées ou archivées
        avec un accès restreint lorsque la loi le permet ou l’exige. Les durées précises par catégorie
        de données doivent être confirmées dans le registre de traitements de l’éditeur.
      </p>
    ),
  },
  {
    title: "7. Vos droits",
    body: (
      <p>
        Dans les conditions prévues par la réglementation applicable, vous pouvez demander l’accès
        à vos données, leur rectification, leur effacement, la limitation du traitement, vous opposer
        à certains traitements et, lorsque cela s’applique, demander la portabilité ou retirer votre
        consentement. Vous pouvez exercer vos droits à l’adresse
        {" "}<a className="text-[#f97316] underline" href="mailto:contact@recrutement-prive.com">contact@recrutement-prive.com</a>.
        Une vérification raisonnable de votre identité pourra être demandée afin de protéger vos données.
        Vous pouvez également introduire une réclamation auprès de la CNIL (www.cnil.fr) si vous estimez
        que vos droits ne sont pas respectés.
      </p>
    ),
  },
  {
    title: "8. Sécurité",
    body: (
      <p>
        Recrutement Privé met en œuvre des mesures techniques et organisationnelles destinées à
        protéger les données contre l’accès non autorisé, la perte, l’altération ou la divulgation.
        Aucun service en ligne ne pouvant garantir une sécurité absolue, nous vous invitons à choisir
        un mot de passe robuste et à ne jamais le communiquer.
      </p>
    ),
  },
  {
    title: "9. Transferts hors de l’Espace économique européen",
    body: (
      <p>
        Si un prestataire ou un traitement implique un transfert de données hors de l’Espace
        économique européen, ce transfert doit être encadré par un mécanisme prévu par la
        réglementation applicable et des garanties appropriées. Les informations précises sur
        les prestataires, pays concernés et garanties doivent être communiquées en fonction des
        services effectivement utilisés.
      </p>
    ),
  },
  {
    title: "10. Mise à jour de cette politique",
    body: (
      <p>
        Cette politique peut être mise à jour pour refléter les évolutions du service ou de la
        réglementation. La date de dernière mise à jour sera indiquée lors de chaque révision.
      </p>
    ),
  },
];

export default function PolitiqueConfidentialitePage() {
  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-14 text-white md:px-8 md:py-20">
      <article className="mx-auto max-w-4xl border border-white/10 bg-[#111] p-7 md:p-12">
        <Link href="/" className="text-sm font-semibold text-[#f97316] hover:underline">
          ← Recrutement Privé
        </Link>
        <p className="mt-10 text-[10px] uppercase tracking-[0.3em] text-[#f97316]">Protection des données</p>
        <h1 className="mt-3 font-serif text-4xl md:text-5xl">Politique de confidentialité</h1>
        <p className="mt-5 text-sm leading-7 text-white/65">
          Cette page explique les principales catégories de données susceptibles d’être traitées
          lorsque vous utilisez Recrutement Privé, les finalités de ces traitements et les moyens
          d’exercer vos droits.
        </p>
        <div className="mt-8 border border-[#f97316]/25 bg-[#f97316]/5 p-4 text-sm leading-6 text-white/70">
          <strong className="text-white">Information importante :</strong> cette version décrit les
          traitements identifiables à partir des parcours actuellement présents sur le site.
          Les coordonnées juridiques complètes de l’éditeur, les durées de conservation par catégorie
          et la liste exhaustive des prestataires doivent encore être validées et complétées par l’éditeur.
        </div>
        <div className="mt-10 space-y-9">
          {sections.map((section) => (
            <section key={section.title} className="space-y-3">
              <h2 className="text-xl font-semibold text-white">{section.title}</h2>
              <div className="space-y-3 text-sm leading-7 text-white/65">{section.body}</div>
            </section>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap gap-5 border-t border-white/10 pt-6 text-sm">
          <Link href="/mentions-legales" className="text-[#f97316] underline">Mentions légales</Link>
          <a href="mailto:contact@recrutement-prive.com" className="text-[#f97316] underline">Contacter Recrutement Privé</a>
        </div>
      </article>
    </main>
  );
}
