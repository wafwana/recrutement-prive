import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { generateMonthlySummary, generateQuarterlyDossier } from "@/lib/accounting/pre-accounting";

async function requireOwner() {
  const activeSession = getActiveSessionContext();
  const session = activeSession || (await auth());
  const userId = typeof session?.user?.id === "string" ? session.user.id : undefined;
  const role = typeof session?.user?.role === "string" ? session.user.role : undefined;
  if (!userId || !["OWNER", "ADMIN", "CONSULTANT"].includes(role || "")) return null;
  if (!(await hasPermission(userId, role, "PRE_ACCOUNTING"))) return null;
  return session.user;
}

export async function GET(request: Request) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ error: "Permission pre-comptabilité non accordée par l’Owner." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : new Date().getFullYear();
  const quarter = searchParams.get("quarter") ? parseInt(searchParams.get("quarter")!) : Math.ceil((new Date().getMonth() + 1) / 3);

  try {
    const quarterlyDossier = await generateQuarterlyDossier(year, quarter);
    return NextResponse.json({ dossier: quarterlyDossier });
  } catch (err) {
    console.error("[pre-accounting error]", err);
    return NextResponse.json({ error: "Erreur lors du calcul pré-comptable." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ error: "Accès strictement réservé à l'Owner." }, { status: 403 });
  }

  let body: {
    year: number;
    quarter?: number;
    month?: number;
    action: "LOCK" | "UNLOCK";
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const { year, quarter, month, action } = body;
  const isLocked = action === "LOCK";
  const periodType = month ? "MONTHLY" : "QUARTERLY";

  try {
    if (periodType === "MONTHLY" && month) {
      await prisma.accountingPeriod.upsert({
        where: {
          year_month_periodType: {
            year,
            month,
            periodType: "MONTHLY",
          },
        },
        create: {
          year,
          month,
          periodType: "MONTHLY",
          isLocked,
          lockedAt: isLocked ? new Date() : null,
          lockedByUserId: owner.id,
        },
        update: {
          isLocked,
          lockedAt: isLocked ? new Date() : null,
          lockedByUserId: owner.id,
        },
      });
    } else if (quarter) {
      await prisma.accountingPeriod.upsert({
        where: {
          year_month_periodType: {
            year,
            month: 0,
            periodType: "QUARTERLY",
          },
        },
        create: {
          year,
          quarter,
          month: 0,
          periodType: "QUARTERLY",
          isLocked,
          lockedAt: isLocked ? new Date() : null,
          lockedByUserId: owner.id,
        },
        update: {
          isLocked,
          lockedAt: isLocked ? new Date() : null,
          lockedByUserId: owner.id,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        actorUserId: owner.id!,
        actorRole: "OWNER",
        action: isLocked ? "LOCK_ACCOUNTING_PERIOD" : "UNLOCK_ACCOUNTING_PERIOD",
        targetType: "ACCOUNTING_PERIOD",
        details: { year, quarter, month, periodType, isLocked },
      },
    });

    return NextResponse.json({ ok: true, isLocked, message: `Période comptable ${isLocked ? "verrouillée (DOSSIER COMPTABLE PRÊT)" : "déverrouillée"}.` });
  } catch (err) {
    console.error("[lock accounting period error]", err);
    return NextResponse.json({ error: "Erreur lors de la mise à jour de la période comptable." }, { status: 500 });
  }
}
