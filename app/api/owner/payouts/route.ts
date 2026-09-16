import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createPayoutSchema = z.object({
  idempotencyKey: z.string().min(10, "Clé d'idempotence invalide"),
  beneficiaryName: z.string().trim().min(2),
  beneficiaryEmail: z.string().trim().email(),
  beneficiaryIban: z.string().trim().optional(),
  reason: z.string().trim().min(5, "Motif/Description obligatoire"),
  jobId: z.string().optional(),
  invoiceRef: z.string().optional(),
  amountHt: z.number().positive("Montant HT positif requis"),
  amountTva: z.number().min(0).default(0),
  amountTtc: z.number().positive("Montant TTC positif requis"),
  fees: z.number().min(0).default(0),
  currency: z.string().default("EUR"),
});

const decisionPayoutSchema = z.object({
  payoutId: z.string().min(1),
  decision: z.enum(["AUTHORIZED", "REJECTED"]),
  decisionNotes: z.string().trim().min(5, "Raison de la décision obligatoire"),
});

async function requireOwner() {
  const activeSession = getActiveSessionContext();
  const session = activeSession || (await auth());
  if (!session?.user?.id || session.user.role !== "OWNER") return null;
  return session.user;
}

export async function GET() {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ error: "Accès strictement réservé à l'Owner." }, { status: 403 });
  }

  const payouts = await prisma.financialPayoutRequest.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ payouts });
}

export async function POST(request: Request) {
  const activeSession = getActiveSessionContext();
  const session = activeSession || (await auth());

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const parsed = createPayoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Données de paiement invalides." },
      { status: 400 }
    );
  }

  try {
    const payout = await prisma.financialPayoutRequest.create({
      data: {
        idempotencyKey: parsed.data.idempotencyKey,
        beneficiaryName: parsed.data.beneficiaryName,
        beneficiaryEmail: parsed.data.beneficiaryEmail,
        beneficiaryIban: parsed.data.beneficiaryIban || null,
        reason: parsed.data.reason,
        jobId: parsed.data.jobId || null,
        invoiceRef: parsed.data.invoiceRef || null,
        amountHt: parsed.data.amountHt,
        amountTva: parsed.data.amountTva,
        amountTtc: parsed.data.amountTtc,
        fees: parsed.data.fees,
        currency: parsed.data.currency,
        status: "PENDING",
      },
    });

    await prisma.ownerNotification.create({
      data: {
        title: "Demande de versement en attente d'autorisation OWNER",
        message: `Montant : ${payout.amountTtc} ${payout.currency} pour ${payout.beneficiaryName} (${payout.beneficiaryEmail}). Motif : ${payout.reason}`,
        status: "UNREAD",
        senderName: session.user.name || session.user.email || "Système",
        senderRole: session.user.role || "UNKNOWN",
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: session.user.id,
        actorRole: session.user.role || "UNKNOWN",
        action: "CREATE_PAYOUT_REQUEST",
        targetType: "FINANCIAL_PAYOUT",
        targetId: payout.id,
        details: {
          idempotencyKey: payout.idempotencyKey,
          amountTtc: payout.amountTtc,
          beneficiaryEmail: payout.beneficiaryEmail,
          status: "PENDING",
        },
      },
    });

    return NextResponse.json({ payout, message: "Demande enregistrée en attente d'autorisation OWNER." }, { status: 201 });
  } catch (error: unknown) {
    // A concurrent request with the same idempotency key is rejected by the DB unique constraint.
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002") {
      const existing = await prisma.financialPayoutRequest.findUnique({
        where: { idempotencyKey: parsed.data.idempotencyKey },
      });
      return NextResponse.json(
        { error: "Demande de versement déjà existante pour cette clé d'idempotence.", payout: existing },
        { status: 409 }
      );
    }
    console.error("[payout create error]", error);
    return NextResponse.json({ error: "Impossible d'enregistrer la demande de versement." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ error: "RÈGLE FINANCIÈRE ABSOLUE : Seul l'OWNER peut autoriser ou refuser un versement." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const parsed = decisionPayoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Données de décision invalides." },
      { status: 400 }
    );
  }

  const existingPayout = await prisma.financialPayoutRequest.findUnique({
    where: { id: parsed.data.payoutId },
  });

  if (!existingPayout) {
    return NextResponse.json({ error: "Demande de versement introuvable." }, { status: 404 });
  }

  // Atomically transition only PENDING -> AUTHORIZED/REJECTED to prevent concurrent decisions.
  const transition = await prisma.financialPayoutRequest.updateMany({
    where: { id: existingPayout.id, status: "PENDING" },
    data: {
      status: parsed.data.decision,
      decisionAt: new Date(),
      decisionByUserId: owner.id,
      decisionNotes: parsed.data.decisionNotes,
    },
  });

  if (transition.count !== 1) {
    return NextResponse.json(
      { error: "Ce versement a déjà été traité par une autre opération." },
      { status: 409 }
    );
  }

  const updatedPayout = await prisma.financialPayoutRequest.findUnique({
    where: { id: existingPayout.id },
  });

  if (!updatedPayout) {
    return NextResponse.json({ error: "Versement introuvable après mise à jour." }, { status: 500 });
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: owner.id!,
      actorRole: "OWNER",
      action: `DECISION_PAYOUT_${parsed.data.decision}`,
      targetType: "FINANCIAL_PAYOUT",
      targetId: updatedPayout.id,
      details: {
        idempotencyKey: updatedPayout.idempotencyKey,
        previousStatus: existingPayout.status,
        newStatus: updatedPayout.status,
        decisionNotes: parsed.data.decisionNotes,
        amountTtc: updatedPayout.amountTtc,
      },
    },
  });

  return NextResponse.json({
    payout: updatedPayout,
    message: `Versement ${parsed.data.decision === "AUTHORIZED" ? "autorisé" : "refusé"} par l'Owner.`,
  });
}
