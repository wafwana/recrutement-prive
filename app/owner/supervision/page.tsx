import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return hours > 0 ? `${hours} h ${minutes} min` : minutes > 0 ? `${minutes} min ${secs} s` : `${secs} s`;
}

function formatLocation(item: { city: string | null; region: string | null; country: string | null; ipAddress: string | null }) {
  const parts = [item.city, item.region, item.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "Localisation indisponible";
}

export default async function OwnerSupervisionPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "OWNER") redirect("/connexion");

  const [users, sessions, logs] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "CONSULTANT"] } },
      select: { id: true, name: true, email: true, role: true, status: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.collaboratorActivitySession.findMany({
      where: { role: { in: ["ADMIN", "CONSULTANT"] } },
      orderBy: { lastSeenAt: "desc" },
      take: 200,
      select: {
        id: true, userId: true, role: true, startedAt: true, lastSeenAt: true, endedAt: true,
        lastPath: true, ipAddress: true, country: true, region: true, city: true,
        userAgent: true, activeSeconds: true,
      },
    }),
    prisma.auditLog.findMany({
      where: { actorRole: { in: ["ADMIN", "CONSULTANT"] } },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, actorUserId: true, actorRole: true, action: true, targetType: true, targetId: true, details: true, createdAt: true },
    }),
  ]);

  const names = new Map(users.map((u) => [u.id, u.name || u.email]));
  const now = Date.now();

  return (
    <main className="min-h-screen bg-[#081625] px-6 py-10 text-[#F8FAFC]">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs uppercase tracking-[0.2em] text-[#F97316]">OWNER · Supervision sécurisée</p>
        <h1 className="mt-2 text-3xl font-semibold">Activité des collaborateurs</h1>
        <p className="mt-3 max-w-4xl text-sm text-white/70">
          Vue réservée exclusivement à l’OWNER : connexions, origine technique, durée d’activité dans la plateforme,
          dernière page active et actions journalisées. Aucun suivi de l’ordinateur ou des autres applications du collaborateur.
        </p>

        <section className="mt-8 overflow-x-auto rounded border border-white/10 bg-white/5">
          <div className="border-b border-white/10 px-5 py-4 font-medium">Sessions récentes</div>
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-white/40">
              <tr><th className="px-5 py-3">Collaborateur</th><th className="px-5 py-3">Connexion</th><th className="px-5 py-3">Depuis</th><th className="px-5 py-3">Durée active</th><th className="px-5 py-3">Dernière activité</th><th className="px-5 py-3">Travail / page</th></tr>
            </thead>
            <tbody>
              {sessions.map((item) => {
                const online = now - item.lastSeenAt.getTime() < 120_000;
                return (
                  <tr key={item.id} className="border-t border-white/10 align-top">
                    <td className="px-5 py-4"><div>{names.get(item.userId) || item.userId}</div><div className="text-xs text-white/40">{item.role}</div></td>
                    <td className="px-5 py-4 whitespace-nowrap">{item.startedAt.toLocaleString("fr-FR")}</td>
                    <td className="px-5 py-4"><div>{formatLocation(item)}</div><div className="text-xs text-white/40">{item.ipAddress || "IP indisponible"}</div></td>
                    <td className="px-5 py-4 whitespace-nowrap">{formatDuration(item.activeSeconds)}</td>
                    <td className="px-5 py-4 whitespace-nowrap"><span className={online ? "text-emerald-300" : "text-white/50"}>{online ? "En ligne" : "Inactif"}</span><div className="text-xs text-white/40">{item.lastSeenAt.toLocaleString("fr-FR")}</div></td>
                    <td className="px-5 py-4"><div className="font-mono text-xs text-[#F97316]">{item.lastPath || "/"}</div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="mt-8 overflow-x-auto rounded border border-white/10 bg-white/5">
          <div className="border-b border-white/10 px-5 py-4 font-medium">Actions métier journalisées</div>
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-white/40">
              <tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Collaborateur</th><th className="px-5 py-3">Action</th><th className="px-5 py-3">Cible</th><th className="px-5 py-3">Détails</th></tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-white/10 align-top">
                  <td className="px-5 py-4 whitespace-nowrap">{log.createdAt.toLocaleString("fr-FR")}</td>
                  <td className="px-5 py-4">{names.get(log.actorUserId) || log.actorUserId}<div className="text-xs text-white/40">{log.actorRole}</div></td>
                  <td className="px-5 py-4 font-mono text-xs text-[#F97316]">{log.action}</td>
                  <td className="px-5 py-4 text-xs">{log.targetType || "—"}{log.targetId ? ` · ${log.targetId}` : ""}</td>
                  <td className="max-w-[420px] px-5 py-4 text-xs text-white/60">{log.details ? JSON.stringify(log.details) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {!sessions.length && !logs.length && <p className="mt-6 text-sm text-white/50">Aucune activité collaborateur enregistrée pour le moment.</p>}
      </div>
    </main>
  );
}
