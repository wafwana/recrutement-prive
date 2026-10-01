import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { getTelephonySettings, updateTelephonySettings } from "@/lib/telephony/config";
import { listStaffTelephonyPermissions, setOutboundCallPermission } from "@/lib/telephony/permissions";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

function isOwner(session: any) {
  return Boolean(session?.user?.id && session.user.role === "OWNER");
}

const updateSettingsSchema = z.object({
  centralPhoneNumber: z.string().min(5).optional(),
  ownerPhone: z.string().min(5).optional(),
  secondaryPhone: z.string().nullable().optional(),
  ringMode: z.enum(["SEQUENTIAL", "SIMULTANEOUS"]).optional(),
  transferDelaySeconds: z.number().min(5).max(60).optional(),
  offHoursBehavior: z.enum(["VOICEMAIL", "REJECT", "TRANSFER_OWNER"]).optional(),
  customIvrGreeting: z.string().nullable().optional(),
});

const updatePermissionSchema = z.object({
  targetUserId: z.string().min(1),
  canMakeOutboundCalls: z.boolean(),
});

export async function GET() {
  const active = getActiveSessionContext();
  const session = active || (await auth());

  if (!isOwner(session)) {
    return NextResponse.json({ error: "Accès réservé à l'Owner RP." }, { status: 403 });
  }

  try {
    const settings = await getTelephonySettings();
    const staffPermissions = await listStaffTelephonyPermissions();

    let logs: any[] = [];
    if (process.env.DATABASE_URL) {
      logs = await prisma.callLog.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        include: {
          voicemail: true,
          initiatorUser: { select: { id: true, name: true, email: true, role: true } },
        },
      });
    }

    return NextResponse.json({
      settings,
      staffPermissions,
      callLogs: logs,
    });
  } catch (err) {
    console.error("[/api/owner/telephony] GET Exception:", err);
    return NextResponse.json({ error: "Erreur serveur lors de la récupération de la téléphonie." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const active = getActiveSessionContext();
  const session = active || (await auth());

  if (!isOwner(session)) {
    return NextResponse.json({ error: "Accès réservé à l'Owner RP." }, { status: 403 });
  }

  const ownerId = session?.user?.id;
  if (!ownerId) {
    return NextResponse.json({ error: "Session Owner invalide." }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));

    // If updating delegation permission for a staff member
    if (body.targetUserId !== undefined) {
      const parsedPerm = updatePermissionSchema.safeParse(body);
      if (!parsedPerm.success) {
        return NextResponse.json({ error: "Données de permission invalides." }, { status: 400 });
      }

      // Check target is not OWNER (OWNER cannot alter own role/permission via delegation endpoint)
      const targetUser = await prisma.user.findUnique({
        where: { id: parsedPerm.data.targetUserId },
        select: { id: true, role: true },
      });

      if (!targetUser) {
        return NextResponse.json({ error: "Utilisateur cible introuvable." }, { status: 404 });
      }

      if (targetUser.role === "OWNER") {
        return NextResponse.json({ error: "L'OWNER possède toujours l'autorisation suprême d'appel sortant." }, { status: 400 });
      }

      const res = await setOutboundCallPermission(
        parsedPerm.data.targetUserId,
        parsedPerm.data.canMakeOutboundCalls,
        ownerId
      );

      if (!res.ok) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }

      return NextResponse.json({ ok: true, message: "Permission téléphonique mise à jour avec succès." });
    }

    // Otherwise update general telephony configuration
    const parsedConfig = updateSettingsSchema.safeParse(body);
    if (!parsedConfig.success) {
      return NextResponse.json({ error: "Paramètres de téléphonie invalides." }, { status: 400 });
    }

    const updated = await updateTelephonySettings(parsedConfig.data);
    return NextResponse.json({ ok: true, settings: updated });
  } catch (err) {
    console.error("[/api/owner/telephony] PUT Exception:", err);
    return NextResponse.json({ error: "Erreur serveur lors de la mise à jour de la téléphonie." }, { status: 500 });
  }
}
