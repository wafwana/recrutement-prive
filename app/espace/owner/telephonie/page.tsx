import { auth } from "@/auth";
import { redirect } from "next/navigation";
import OwnerTelephonyClient from "./OwnerTelephonyClient";
import { getTelephonySettings } from "@/lib/telephony/config";
import { listStaffTelephonyPermissions } from "@/lib/telephony/permissions";
import { prisma } from "@/lib/prisma";

export default async function OwnerTelephonyPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "OWNER") {
    redirect("/connexion");
  }

  const settings = await getTelephonySettings();
  const staffPermissions = await listStaffTelephonyPermissions();

  let initialCallLogs: any[] = [];
  if (process.env.DATABASE_URL) {
    try {
      initialCallLogs = await prisma.callLog.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        include: {
          voicemail: true,
          initiatorUser: { select: { id: true, name: true, email: true, role: true } },
        },
      });
    } catch (err) {
      console.error("[OwnerTelephonyPage] Error loading call logs:", err);
    }
  }

  return (
    <OwnerTelephonyClient
      initialSettings={settings}
      initialStaffPermissions={staffPermissions.map((s) => ({
        ...s,
        grantedAt: s.grantedAt ? s.grantedAt.toISOString() : null,
      }))}
      initialCallLogs={initialCallLogs.map((log) => ({
        ...log,
        createdAt: log.createdAt.toISOString(),
        updatedAt: log.updatedAt.toISOString(),
        voicemail: log.voicemail
          ? {
              ...log.voicemail,
              createdAt: log.voicemail.createdAt.toISOString(),
              updatedAt: log.voicemail.updatedAt.toISOString(),
            }
          : null,
      }))}
    />
  );
}
