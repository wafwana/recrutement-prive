import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AuthorizationQueue from "./AuthorizationQueue";

const stages = [
  ["01", "Identification", "Le cabinet repère et qualifie les profils pertinents."],
  ["02", "Présentation", "L'entreprise reçoit une présentation exécutive anonymisée et argumentée."],
  ["03", "Autorisation", "Le cabinet contrôle l'accès au candidat et ouvre le contact."],
  ["04", "Contact sécurisé", "30 minutes dans la plateforme, messagerie ou visioconférence."],
  ["05", "Évaluation", "Compte rendu, éléments de suivi et historique de mission."],
  ["06", "Décision", "Après 3 contacts réalisés, l'entreprise doit se positionner."],
] as const;

export default async function OwnerContactsPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "OWNER") redirect("/connexion");
  const [pending, sent, meetings, decisions, completed, authorizationRows] = await Promise.all([
    prisma.outreachContact.count({ where: { status: { in: ["PENDING","QUEUED"] } } }),
    prisma.outreachContact.count({ where: { status: { in: ["SENT","DELIVERED"] } } }),
    prisma.contactMeeting.count({ where: { status: { in: ["REQUESTED","CONFIRMED","ACTIVE"] } } }),
    prisma.contactMeeting.count({ where: { decisionRequired: true } }),
    prisma.contactMeeting.count({ where: { status: "COMPLETED" } }),
    prisma.contactMeeting.findMany({ where: { status: "REQUESTED" }, include: { presentation: { select: { candidateAlias: true } } }, orderBy: { createdAt: "asc" }, take: 50 }),
  ]);
  return (
    <main className="min-h-screen bg-[#081625] p-6 text-slate-100 md:p-10">
      <div className="mx-auto max-w-7xl space-y-10">
        <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#10283e] to-[#081625] p-8 shadow-2xl md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-400">RECRUTEMENT PRIVÉ · EXECUTIVE SEARCH</p>
          <div className="mt-4 max-w-4xl">
            <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">Executive Search & Secure Interview Center</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">Une chaîne de recherche, de présentation et de mise en relation conçue comme un cabinet de chasse de tête premium — avec confidentialité, contrôle humain et échanges exclusivement dans la plateforme.</p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">30 min · 99 € TTC</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Messagerie protégée</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Visioconférence interne</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">3 contacts → décision</span>
          </div>
        </header>

        <AuthorizationQueue meetings={authorizationRows.map((meeting) => ({ id: meeting.id, alias: meeting.presentation.candidateAlias, channel: meeting.channel, createdAt: meeting.createdAt.toISOString() }))} />

        <section className="grid gap-4 md:grid-cols-5">
          {[["À qualifier",pending],["Délivrés",sent],["Contacts ouverts",meetings],["Contacts réalisés",completed],["Décisions attendues",decisions]].map(([label,value]) =>
            <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
              <div className="text-sm text-slate-400">{label}</div><div className="mt-2 text-3xl font-semibold">{value}</div>
            </div>
          )}
        </section>

        <section>
          <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-[0.25em] text-orange-400">Méthode propriétaire</p><h2 className="mt-2 text-3xl font-semibold">Une expérience de chasse de tête de bout en bout</h2></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stages.map(([num,title,desc]) => <article key={num} className="rounded-2xl border border-white/10 bg-white/[0.05] p-6"><span className="text-sm font-semibold text-orange-400">{num}</span><h3 className="mt-3 text-xl font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{desc}</p></article>)}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">Présentation exécutive</p>
            <h2 className="mt-2 text-2xl font-semibold">Le candidat n'est pas une fiche CV</h2>
            <p className="mt-3 text-slate-400 leading-7">Chaque présentation doit devenir une recommandation de cabinet : synthèse du parcours, expertise différenciante, adéquation au besoin, points de vigilance et justification du choix. L'identité reste protégée jusqu'au stade autorisé.</p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              {["Executive summary","Fit avec la mission","Forces différenciantes","Points de vigilance","Motivation / mobilité","Recommandation du cabinet"].map(x=><div key={x} className="rounded-xl bg-black/10 p-3 text-slate-300">{x}</div>)}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">Secure Interview</p>
            <h2 className="mt-2 text-2xl font-semibold">La relation passe par Recrutement Privé</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              <li>• Alias et identité contrôlée selon le niveau d'autorisation.</li>
              <li>• Détection et blocage des coordonnées dans les échanges protégés.</li>
              <li>• Timer de 30 minutes et clôture contrôlée.</li>
              <li>• Enregistrement uniquement si les deux participants ont consenti explicitement.</li>
              <li>• Après trois contacts réalisés, la décision de l'entreprise devient obligatoire.</li>
            </ul>
          </div>
        </section>

        <section className="rounded-2xl border border-orange-400/20 bg-orange-400/5 p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">Contrats & gouvernance</p>
          <h2 className="mt-2 text-2xl font-semibold">Un cadre contractuel avant la relation</h2>
          <p className="mt-3 max-w-4xl text-slate-300 leading-7">Les six modèles encadrent le contact entreprise, le candidat, l'entretien sécurisé, la confidentialité et l'anti-contournement, l'enregistrement avec consentement et la politique des canaux sécurisés. Ils restent soumis à validation juridique avant signature et activation commerciale.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">{["Contact entreprise","Entretien sécurisé","Anti-contournement","Consentement enregistrement","Canaux sécurisés","Cadre candidat"].map(x=><div key={x} className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">{x}</div>)}</div>
        </section>
      </div>
    </main>
  );
}