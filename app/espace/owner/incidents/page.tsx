import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type IncidentDetails = {
  module?: string;
  event?: string;
  severity?: string;
  route?: string | null;
  summary?: string;
  fingerprint?: string;
  correlationId?: string | null;
  status?: string;
  occurredAt?: string;
};

export default async function OwnerIncidentsPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "OWNER") redirect("/connexion");

  const events = await prisma.auditLog.findMany({
    where: { action: "TECHNICAL_INCIDENT" },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, targetId: true, details: true, createdAt: true },
  });
  const incidents = new Map<string, { details: IncidentDetails; count: number; firstSeen: Date; lastSeen: Date }>();
  for (const event of events) {
    const details = event.details && typeof event.details === "object" && !Array.isArray(event.details)
      ? event.details as IncidentDetails : {};
    const key = event.targetId || details.fingerprint || event.id;
    const existing = incidents.get(key);
    if (existing) {
      existing.count += 1;
      if (event.createdAt < existing.firstSeen) existing.firstSeen = event.createdAt;
    } else {
      incidents.set(key, { details, count: 1, firstSeen: event.createdAt, lastSeen: event.createdAt });
    }
  }
  const rows = [...incidents.values()].sort((a,b)=>b.lastSeen.getTime()-a.lastSeen.getTime());
  const openCount = rows.filter((item)=>item.details.status !== "RESOLVED").length;

  return (
    <section className="mx-auto w-[min(1180px,calc(100%-40px))] py-12 md:w-[min(1180px,calc(100%-72px))] md:py-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#c7a15a]">Owner · Supervision technique</p>
          <h1 className="mt-3 font-serif text-4xl">Historique des incidents.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/50">Événements techniques regroupés par empreinte, sans exposer les CV, coordonnées personnelles, secrets ou traces brutes.</p>
        </div>
        <Link href="/espace/owner" className="border border-white/15 px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-white/65">Retour cockpit</Link>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="border border-white/10 bg-[#111] p-5"><p className="text-xs text-white/40">Événements consultés</p><p className="mt-2 text-3xl">{events.length}</p></div>
        <div className="border border-white/10 bg-[#111] p-5"><p className="text-xs text-white/40">Incidents regroupés</p><p className="mt-2 text-3xl">{rows.length}</p></div>
        <div className="border border-white/10 bg-[#111] p-5"><p className="text-xs text-white/40">Incidents ouverts</p><p className="mt-2 text-3xl">{openCount}</p></div>
      </div>
      <div className="mt-8 space-y-3">
        {rows.map((row, index) => (
          <article key={row.details.fingerprint || index} className="border border-white/10 bg-[#111] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="border border-white/15 px-2 py-1 text-[10px] uppercase text-[#c7a15a]">{row.details.module || "PLATFORM"}</span>
                <span className="text-xs text-white/60">{row.details.event || "Incident technique"}</span>
              </div>
              <span className="text-[10px] uppercase text-white/40">{row.details.severity || "MEDIUM"} · {row.details.status || "OPEN"}</span>
            </div>
            <p className="mt-3 text-sm text-white/80">{row.details.summary || "Incident sans description."}</p>
            {row.details.route && <p className="mt-2 text-xs text-white/40">Route : {row.details.route}</p>}
            <p className="mt-3 text-[10px] text-white/35">Dernière occurrence : {row.lastSeen.toLocaleString("fr-FR")} · Première occurrence : {row.firstSeen.toLocaleString("fr-FR")} · {row.count} événement(s)</p>
          </article>
        ))}
        {rows.length === 0 && <div className="border border-white/10 p-8 text-sm text-white/45">Aucun incident technique n’a encore été enregistré. Les nouveaux incidents instrumentés apparaîtront ici.</div>}
      </div>
    </section>
  );
}
