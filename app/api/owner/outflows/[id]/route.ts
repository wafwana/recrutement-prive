import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { evaluateOutflowStatus, validateOutflowAmounts, OutflowAuditEntry, OutflowStatus } from "@/lib/accounting/outflow-service";
import { Prisma } from "@prisma/client";
import { z } from "zod";

async function requireOwner() {
  const activeSession = getActiveSessionContext();
  if (activeSession) {
    if (!activeSession.user?.id || activeSession.user.role !== "OWNER") return null;
    return activeSession.user;
  }
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "OWNER") return null;
    return session.user;
  } catch {
    return null;
  }
}

const updateOutflowSchema = z.object({
  category: z.string().trim().optional(),
  description: z.string().trim().optional(),
  documentUrl: z.string().optional(),
  documentId: z.string().optional(),
  paymentMethod: z.string().optional(),
  paymentSource: z.string().optional(),
  referenceNumber: z.string().optional(),
  status: z.enum(["PREVU", "AUTORISE", "PAYE", "RAPPROCHE", "A_COMPLETER", "ANNULE"]).optional(),
  reconciliationStatus: z.string().optional(),
  isPrivateOwnerExpense: z.boolean().optional(),
  amountHt: z.number().min(0).optional(),
  amountTva: z.number().min(0).optional(),
  amountTtc: z.number().positive().optional(),
  reason: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { error: "Accès strictement réservé à l'Owner." },
      { status: 403 }
    );
  }

  const resolvedParams = await params;
  const outflow = await prisma.financialOutflow.findUnique({
    where: { id: resolvedParams.id },
  });

  if (!outflow) {
    return NextResponse.json({ error: "Décaissement introuvable." }, { status: 404 });
  }

  return NextResponse.json({ outflow });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { error: "Accès strictement réservé à l'Owner. Seul l'OWNER peut modifier un enregistrement comptable." },
      { status: 403 }
    );
  }

  const resolvedParams = await params;
  const existing = await prisma.financialOutflow.findUnique({
    where: { id: resolvedParams.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Décaissement introuvable." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const parsed = updateOutflowSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Données de modification invalides." },
      { status: 400 }
    );
  }

  const newHt = parsed.data.amountHt !== undefined ? parsed.data.amountHt : existing.amountHt;
  const newTva = parsed.data.amountTva !== undefined ? parsed.data.amountTva : existing.amountTva;
  const newTtc = parsed.data.amountTtc !== undefined ? parsed.data.amountTtc : existing.amountTtc;

  if (!validateOutflowAmounts(newHt, newTva, newTtc)) {
    return NextResponse.json(
      { error: "Montants invalides : la somme HT + TVA doit être égale au montant TTC." },
      { status: 400 }
    );
  }

  const targetCategory = parsed.data.category !== undefined ? parsed.data.category : existing.category;
  const targetDocUrl = parsed.data.documentUrl !== undefined ? parsed.data.documentUrl : existing.documentUrl;
  const targetDocId = parsed.data.documentId !== undefined ? parsed.data.documentId : existing.documentId;
  const targetStatus = (parsed.data.status || existing.status) as OutflowStatus;

  const effectiveStatus = evaluateOutflowStatus(targetStatus, targetCategory, targetDocUrl, targetDocId);

  // Build traceable audit record
  const currentAudit = Array.isArray(existing.auditHistory)
    ? (existing.auditHistory as unknown as OutflowAuditEntry[])
    : [];

  const changes: Record<string, { from: unknown; to: unknown }> = {};
  if (parsed.data.category !== undefined && parsed.data.category !== existing.category) {
    changes.category = { from: existing.category, to: parsed.data.category };
  }
  if (parsed.data.documentUrl !== undefined && parsed.data.documentUrl !== existing.documentUrl) {
    changes.documentUrl = { from: existing.documentUrl, to: parsed.data.documentUrl };
  }
  if (effectiveStatus !== existing.status) {
    changes.status = { from: existing.status, to: effectiveStatus };
  }
  if (parsed.data.amountTtc !== undefined && parsed.data.amountTtc !== existing.amountTtc) {
    changes.amountTtc = { from: existing.amountTtc, to: parsed.data.amountTtc };
  }

  const auditEntry: OutflowAuditEntry = {
    timestamp: new Date().toISOString(),
    actorUserId: owner.id!,
    actorRole: "OWNER",
    action: parsed.data.status === "ANNULE" ? "REVERSAL_OUTFLOW" : "UPDATE_OUTFLOW",
    notes: parsed.data.notes || parsed.data.reason || "Modification comptable enregistrée par l'Owner",
    changes,
  };

  const updatedOutflow = await prisma.financialOutflow.update({
    where: { id: existing.id },
    data: {
      category: targetCategory,
      description: parsed.data.description !== undefined ? parsed.data.description : existing.description,
      documentUrl: targetDocUrl,
      documentId: targetDocId,
      paymentMethod: parsed.data.paymentMethod !== undefined ? parsed.data.paymentMethod : existing.paymentMethod,
      paymentSource: parsed.data.paymentSource !== undefined ? parsed.data.paymentSource : existing.paymentSource,
      referenceNumber: parsed.data.referenceNumber !== undefined ? parsed.data.referenceNumber : existing.referenceNumber,
      status: effectiveStatus,
      reconciliationStatus: parsed.data.reconciliationStatus !== undefined ? parsed.data.reconciliationStatus : existing.reconciliationStatus,
      isPrivateOwnerExpense: parsed.data.isPrivateOwnerExpense !== undefined ? parsed.data.isPrivateOwnerExpense : existing.isPrivateOwnerExpense,
      amountHt: newHt,
      amountTva: newTva,
      amountTtc: newTtc,
      reason: parsed.data.reason !== undefined ? parsed.data.reason : existing.reason,
      auditHistory: [...currentAudit, auditEntry] as unknown as Prisma.InputJsonValue,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: owner.id!,
      actorRole: "OWNER",
      action: parsed.data.status === "ANNULE" ? "CANCEL_FINANCIAL_OUTFLOW" : "UPDATE_FINANCIAL_OUTFLOW",
      targetType: "FINANCIAL_OUTFLOW",
      targetId: updatedOutflow.id,
      details: {
        outflowNumber: updatedOutflow.outflowNumber,
        changes: changes as unknown as Prisma.InputJsonValue,
        newStatus: updatedOutflow.status,
      },
    },
  });

  return NextResponse.json({
    outflow: updatedOutflow,
    message: "Opération comptable mise à jour avec traçabilité et historique d'audit.",
  });
}

export async function DELETE(
  _request: Request,
  _context: { params: Promise<{ id: string }> }
) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ error: "Accès strictement réservé à l'Owner." }, { status: 403 });
  }

  // Interdiction de suppression silencieuse selon la RÈGLE ABSOLUE
  return NextResponse.json(
    {
      error: "Suppression physique interdite. Conformément aux règles de traçabilité comptable, une opération enregistrée ne peut pas être supprimée silencieusement. Veuillez passer son statut en « ANNULÉ » pour enregistrer une contrepassation traçable.",
    },
    { status: 400 }
  );
}
