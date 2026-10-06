import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import SecureContactPanel from "./SecureContactPanel";

export default async function ExecutivePresentationPage({ params }: { params: Promise<{ presentationId: string }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ENTREPRISE") redirect("/connexion");

  const { presentationId } = await params;
  const presentation = await prisma.missionPresentation.findFirst({
    where: {
      id: presentationId,
      companyUserId: session.user.id,
      anonymousMessagingEnabled: true,
      state: { notIn: ["IDENTITE_DEBLOQUEE", "MISSION_TERMINEE"] },
    },
    include: {
      mission: { select: { id: true, title: true, location: true, description: true, requiredSkills: true, requiredExperienceYears: true } },
      candidate: { select: { id: true, headline: true, bio: true, experienceYears: true, country: true, primaryCategory: { select: { name: true } }, documents: { where: { isPrimaryCv: true }, orderBy: { createdAt: "desc" }, take: 1, select: { analysis: true } } } },
      contactMeetings: { orderBy: { createdAt: "desc" }, select: { id: true, status: true, channel: true, scheduledAt: true, startedAt: true, endedAt: true, priceTtc: true, paymentStatus: true, decisionRequired: true, decisionStatus: true, createdAt: true } },
    },
  });
  if (!presentation) notFound();

  const completed = presentation.contactMeetings.filter((meeting) => meeting.status === "COMPLETED").length;
  const analysis = presentation.candidate.documents[0]?.analysis;
  const analysisRecord = analysis && typeof analysis === "object" && !Array.isArray(analysis) ? analysis as Record<string, unknown> : {};
  const arrayValue = (key: string) => Array.isArray(analysisRecord[key]) ? analysisRecord[key].filter((v): v is string => typeof v === "string").slice(0, 6) : [];
  const executiveSummary = typeof analysisRecord.executiveSummary === "string" ? analysisRecord.executiveSummary : presentation.candidate.bio;
  const recommendation = typeof analysisRecord.recommendation === "string" ? analysisRecord.recommendation : "Profil retenu par Recrutement Privé après analyse du parcours et de l'adéquation à la mission.";
  const strengths = arrayValue("strengths").length ? arrayValue("strengths") : arrayValue("pointsForts");
  const vigilance = arrayValue("risks").length ? arrayValue("risks") : arrayValue("pointsVigilance");
  const skills = arrayValue("skills");
  const categoryName = presentation.candidate.primaryCategory?.name && typeof presentation.candidate.primaryCategory.name === "object"
    ? ((presentation.candidate.primaryCategory.name as Record<string, string>).fr || (presentation.candidate.primaryCategory.name as Record<string, string>).en)
    : typeof presentation.candidate.primaryCategory?.name === "string" ? presentation.candidate.primaryCategory.name : null;

  return (
    <main className="min-h-screen bg-[#081625] text-white">
      <div className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
        <header className="border border-white/10 bg-gradient-to-br from-[#10283e] to-[#081625] p-8 md:p-12">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#c7a15a]">Recrutement Privé · Executive Search</p>
              <h1 className="mt-4 font-serif text-4xl tracking-tight md:text-6xl">Présentation confidentielle</h1>
              <p className="mt-4 text-lg text-white/55">{presentation.candidateAlias || "Profil Executive anonymisé"} · {presentation.mission.title}</p>
            </div>
            <div className="border border-white/10 bg-black/10 p-5 text-sm"><span className="block text-white/35">Statut de la mission</span><strong className="mt-2 block">{presentation.state.replaceAll("_", " ")}</strong><span className="mt-1 block text-xs text-[#c7a15a]">Identité protégée</span></div>
          </div>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          {[["Expérience", presentation.candidate.experienceYears ? `${presentation.candidate.experienceYears} ans` : "À qualifier"], ["Spécialité", categoryName || "Executive profile"], ["Mobilité", presentation.candidate.country || "International"], ["Contacts", `${completed}/3`]].map(([label,value]) => <div key={label} className="border border-white/10 bg-white/[0.04] p-5"><span className="text-[10px] uppercase tracking-[0.2em] text-white/35">{label}</span><strong className="mt-3 block text-lg">{value}</strong></div>)}
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
          <article className="border border-white/10 bg-white/[0.03] p-7 md:p-9">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Executive Summary</p>
            <h2 className="mt-3 font-serif text-3xl">Pourquoi ce profil mérite votre attention</h2>
            <p className="mt-5 whitespace-pre-line text-sm leading-8 text-white/60">{executiveSummary || "Synthèse en cours de finalisation par le cabinet."}</p>
            <div className="mt-8 border-l border-[#c7a15a] pl-5"><p className="text-[10px] uppercase tracking-[0.2em] text-[#c7a15a]">Recommandation du cabinet</p><p className="mt-2 text-sm leading-7 text-white/70">{recommendation}</p></div>
          </article>
          <aside className="border border-white/10 bg-white/[0.03] p-7">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Mission</p>
            <h2 className="mt-3 font-serif text-2xl">{presentation.mission.title}</h2>
            <p className="mt-2 text-xs text-white/40">{presentation.mission.location || "Localisation confidentielle"}</p>
            <p className="mt-5 text-sm leading-7 text-white/55">{presentation.mission.description || "Brief de mission disponible dans votre espace entreprise."}</p>
          </aside>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <article className="border border-white/10 p-7"><p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Forces différenciantes</p><div className="mt-5 space-y-2">{(strengths.length ? strengths : ["Expertise métier analysée", "Adéquation au besoin", "Parcours qualifié par le cabinet"]).map(item => <div key={item} className="border border-white/10 bg-white/[0.03] p-4 text-sm text-white/65">{item}</div>)}</div></article>
          <article className="border border-white/10 p-7"><p className="text-[10px] uppercase tracking-[0.25em] text-white/45">Points de vigilance</p><div className="mt-5 space-y-2">{(vigilance.length ? vigilance : ["Éléments à approfondir pendant l'entretien", "Disponibilité et conditions à confirmer"]).map(item => <div key={item} className="border border-white/10 bg-white/[0.03] p-4 text-sm text-white/55">{item}</div>)}</div></article>
        </section>

        {skills.length > 0 && <section className="mt-6 border border-white/10 p-7"><p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Expertises détectées</p><div className="mt-5 flex flex-wrap gap-2">{skills.map(skill => <span key={skill} className="border border-white/10 px-3 py-2 text-xs text-white/60">{skill}</span>)}</div></section>}

        <section className="mt-10"><SecureContactPanel presentationId={presentation.id} completed={completed} /></section>

        <section className="mt-8 border border-white/10 p-7">
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/35">Historique sécurisé</p>
          <div className="mt-5 divide-y divide-white/10">{presentation.contactMeetings.length === 0 ? <p className="py-4 text-sm text-white/40">Aucun contact n'a encore été demandé.</p> : presentation.contactMeetings.map(meeting => <div key={meeting.id} className="flex flex-col gap-2 py-4 text-xs sm:flex-row sm:items-center sm:justify-between"><div><strong className="text-white/70">{meeting.channel === "VIDEO" ? "Visioconférence" : "Messagerie"} · 30 min</strong><span className="ml-3 text-white/35">{new Date(meeting.createdAt).toLocaleDateString("fr-FR")}</span></div><span className="uppercase tracking-[0.15em] text-white/35">{meeting.status} · {meeting.paymentStatus}</span></div>)}</div>
        </section>

        <footer className="mt-10 border-t border-white/10 pt-6 text-xs leading-6 text-white/35">
          Confidentialité Recrutement Privé · L'identité, les coordonnées et les documents détaillés restent sous contrôle du cabinet. Aucun échange de coordonnées directes n'est nécessaire pour mener le processus.
        </footer>
      </div>
    </main>
  );
}
