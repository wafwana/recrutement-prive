import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function OwnerContactsPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "OWNER") redirect("/connexion");
  const [pending, sent, meetings, decisions] = await Promise.all([
    prisma.outreachContact.count({ where: { status: { in: ["PENDING","QUEUED"] } } }),
    prisma.outreachContact.count({ where: { status: { in: ["SENT","DELIVERED"] } } }),
    prisma.contactMeeting.count({ where: { status: { in: ["REQUESTED","CONFIRMED","ACTIVE"] } } }),
    prisma.contactMeeting.count({ where: { decisionRequired: true } }),
  ]);
  const templates = [
    ["ENTREPRISE_CONTACT", "Conditions du contact sécurisé — entreprise"],
    ["CANDIDAT_CONTACT", "Conditions du contact sécurisé — candidat"],
    ["INTERVIEW_SECURE", "Convention d'entretien sécurisé"],
    ["ANTI_CIRCUMVENTION", "Confidentialité et interdiction de contournement"],
    ["RECORDING_CONSENT", "Notice et consentement à l'enregistrement"],
    ["SECURE_CHANNEL_POLICY", "Politique messagerie / visioconférence sécurisée"],
  ];
  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">OWNER</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Outreach & Contacts sécurisés</h1>
          <p className="mt-2 max-w-3xl text-slate-600">Premier contact automatisé, délivrabilité, entretiens internes à 99 € TTC / 30 min, contrats et suivi des décisions.</p>
        </header>
        <section className="grid gap-4 md:grid-cols-4">
          {[
            ["Contacts en attente", pending],
            ["Emails envoyés/livrés", sent],
            ["Entretiens actifs", meetings],
            ["Décisions à obtenir", decisions],
          ].map(([label,value]) => <div key={String(label)} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="text-sm text-slate-500">{label}</div><div className="mt-2 text-3xl font-bold text-slate-900">{value}</div></div>)}
        </section>
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Automatisation email</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li>• Entreprises et candidats séparés.</li>
              <li>• Anti-duplication par campagne et destinataire.</li>
              <li>• Bounce, complaint et désinscription bloquent les futurs envois.</li>
              <li>• Activation réelle uniquement lorsque RP_AUTO_OUTREACH_ENABLED=true.</li>
              <li>• SPF / DKIM / DMARC et montée en charge à valider avant campagne.</li>
            </ul>
          </div>
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Contact sécurisé</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li>• 30 minutes — 99 € TTC / 82,50 € HT.</li>
              <li>• Messagerie interne ou visioconférence.</li>
              <li>• Aucun échange de coordonnées autorisé.</li>
              <li>• Après 3 contacts réalisés : décision entreprise obligatoire.</li>
              <li>• Enregistrement uniquement après information et consentement explicite des deux participants.</li>
            </ul>
          </div>
        </section>
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Contrats / documents</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">{templates.map(([key,title]) => <div key={key} className="rounded-xl border p-4"><div className="font-medium text-slate-900">{title}</div><div className="mt-1 text-xs text-slate-500">Clé : {key} · validation juridique requise avant signature</div></div>)}</div>
        </section>
      </div>
    </main>
  );
}
