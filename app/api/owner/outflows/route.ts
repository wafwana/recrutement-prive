import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createOrSyncOutflow, exportOutflowsToCsv, OutflowOriginModule, OutflowStatus } from "@/lib/accounting/outflow-service";
import { z } from "zod";
import { randomUUID } from "crypto";

type AuthResult =
  | { user: { id: string; role: string; name?: string | null; email?: string | null }; status: 200 }
  | { error: string; status: 401 | 403 };

async function verifyOwnerAccess(): Promise<AuthResult> {
  const activeSession = getActiveSessionContext();
  if (activeSession) {
    if (!activeSession.user) {
      return { error: "Session non authentifiée. Veuillez vous connecter.", status: 401 };
    }
    if (activeSession.user.role !== "OWNER" || !activeSession.user.id) {
      return { error: "Accès strictement réservé à l'Owner. Décaissements et registre comptable réservés à l'Owner.", status: 403 };
    }
    return { user: activeSession.user as { id: string; role: string; name?: string | null; email?: string | null }, status: 200 };
  }

  try {
    const session = await auth();
    if (!session?.user) {
      return { error: "Session non authentifiée. Veuillez vous connecter.", status: 401 };
    }
    if (session.user.role !== "OWNER" || !session.user.id) {
      return { error: "Accès strictement réservé à l'Owner. Décaissements et registre comptable réservés à l'Owner.", status: 403 };
    }
    return { user: session.user as { id: string; role: string; name?: string | null; email?: string | null }, status: 200 };
  } catch {
    return { error: "Session non authentifiée. Veuillez vous connecter.", status: 401 };
  }
}

const createOutflowSchema = z.object({
  beneficiaryName: z.string().trim().min(2, "Nom du bénéficiaire requis"),
  beneficiaryEmail: z.string().trim().email().optional().or(z.literal("")),
  reason: z.string().trim().min(3, "Motif obligatoire"),
  description: z.string().trim().optional(),
  category: z.string().trim().optional(),
  originModule: z.enum([
    "PAIE",
    "PRESTATAIRE",
    "FRAIS_PRO",
    "REMBOURSEMENT",
    "FOURNISSEUR",
    "PRELEVEMENT_OWNER",
    "AUTRE",
  ]).default("AUTRE"),
  amountHt: z.number().min(0, "Montant HT positif ou nul requis"),
  amountTvaRate: z.number().min(0).max(100, "Taux TVA invalide").default(0),
  amountTva: z.number().min(0, "Montant TVA positif ou nul requis").default(0),
  amountTtc: z.number().positive("Montant TTC positif requis"),
  currency: z.string().default("EUR"),
  paymentMethod: z.string().optional(),
  paymentSource: z.string().optional(),
  referenceNumber: z.string().optional(),
  documentUrl: z.string().optional(),
  documentId: z.string().optional(),
  operationDate: z.string().optional(),
  paymentDate: z.string().optional(),
  status: z.enum(["PREVU", "AUTORISE", "PAYE", "RAPPROCHE", "A_COMPLETER", "ANNULE"]).default("PAYE"),
  reconciliationStatus: z.string().default("NON_RAPPROCHE"),
  isPrivateOwnerExpense: z.boolean().default(false),
});

export async function GET(request: Request) {
  const authCheck = await verifyOwnerAccess();
  if (authCheck.status !== 200) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");
    const moduleFilter = searchParams.get("module");
    const categoryFilter = searchParams.get("category");
    const statusFilter = searchParams.get("status");
    const beneficiaryFilter = searchParams.get("beneficiary");
    const yearStr = searchParams.get("year");
    const monthStr = searchParams.get("month");

    const where: Record<string, unknown> = {};

    if (moduleFilter) where.originModule = moduleFilter;
    if (categoryFilter) where.category = categoryFilter;
    if (statusFilter) where.status = statusFilter;
    if (beneficiaryFilter) {
      where.beneficiaryName = { contains: beneficiaryFilter, mode: "insensitive" };
    }

    if (yearStr) {
      const year = parseInt(yearStr, 10);
      if (!isNaN(year) && year > 1900 && year < 2100) {
        let startDate: Date;
        let endDate: Date;
        if (monthStr) {
          const month = parseInt(monthStr, 10);
          if (!isNaN(month) && month >= 1 && month <= 12) {
            startDate = new Date(year, month - 1, 1);
            endDate = new Date(year, month, 0, 23, 59, 59, 999);
          } else {
            startDate = new Date(year, 0, 1);
            endDate = new Date(year, 11, 31, 23, 59, 59, 999);
          }
        } else {
          startDate = new Date(year, 0, 1);
          endDate = new Date(year, 11, 31, 23, 59, 59, 999);
        }
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          where.operationDate = { gte: startDate, lte: endDate };
        }
      }
    }

    const outflows = await prisma.financialOutflow.findMany({
      where,
      orderBy: { operationDate: "desc" },
    });

    if (format === "csv") {
      const csvContent = exportOutflowsToCsv(outflows);
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="registre-sorties-argent-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    // Summary totals
    const totalHt = outflows.reduce((acc, item) => acc + (item.status === "ANNULE" ? 0 : item.amountHt), 0);
    const totalTva = outflows.reduce((acc, item) => acc + (item.status === "ANNULE" ? 0 : item.amountTva), 0);
    const totalTtc = outflows.reduce((acc, item) => acc + (item.status === "ANNULE" ? 0 : item.amountTtc), 0);
    const pendingDocsCount = outflows.filter((item) => item.status === "A_COMPLETER" || !item.category || (!item.documentUrl && !item.documentId)).length;

    return NextResponse.json({
      outflows: outflows.map(({ documentData: _documentData, ...outflow }) => outflow),
      summary: {
        count: outflows.length,
        totalHt,
        totalTva,
        totalTtc,
        pendingDocsCount,
      },
    });
  } catch (error) {
    console.error("[outflows GET error]", error);
    const diagId = `OUT-ERR-${Date.now().toString(36).toUpperCase()}`;
    return NextResponse.json(
      { error: `Erreur serveur lors de la récupération des décaissements. (Réf: ${diagId})` },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authCheck = await verifyOwnerAccess();
  if (authCheck.status !== 200) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }
  const owner = authCheck.user;

  let body: Record<string, unknown>;
  let documentData: Buffer | null = null;
  let documentName: string | null = null;
  let documentMimeType: string | null = null;
  let documentId: string | null = null;

  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("document");
      if (file instanceof File && file.size > 0) {
        if (file.size > 10 * 1024 * 1024) {
          return NextResponse.json({ error: "La pièce justificative ne doit pas dépasser 10 Mo." }, { status: 400 });
        }
        const allowed = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
        const mime = file.type.toLowerCase();
        if (!allowed.has(mime)) {
          return NextResponse.json({ error: "Format refusé. Utilisez uniquement PDF, JPG, JPEG, PNG ou WEBP." }, { status: 400 });
        }
        const bytes = Buffer.from(await file.arrayBuffer());
        const signatureOk =
          (mime === "application/pdf" && bytes.subarray(0, 4).toString() === "%PDF") ||
          (mime === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8) ||
          (mime === "image/png" && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) ||
          (mime === "image/webp" && bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP");
        if (!signatureOk) {
          return NextResponse.json({ error: "Le contenu du fichier ne correspond pas à son format déclaré." }, { status: 400 });
        }
        documentData = bytes;
        documentName = file.name;
        documentMimeType = mime;
        documentId = `OUTFLOW-FILE-${randomUUID()}`;
      }
      body = Object.fromEntries(form.entries());
      body.amountHt = Number(body.amountHt);
      body.amountTvaRate = Number(body.amountTvaRate || 0);
      body.amountTva = Math.round((Number(body.amountHt) * Number(body.amountTvaRate) / 100) * 100) / 100;
      body.amountTtc = Math.round((Number(body.amountHt) + Number(body.amountTva)) * 100) / 100;
    } else {
      const json = await request.json();
      if (!json || typeof json !== "object") throw new Error("invalid");
      body = json as Record<string, unknown>;
      const ht = Number(body.amountHt);
      const legacyTva = body.amountTva !== undefined ? Number(body.amountTva) : 0;
      const rate = body.amountTvaRate !== undefined
        ? Number(body.amountTvaRate)
        : (ht > 0 ? (legacyTva / ht) * 100 : 0);
      body.amountTvaRate = rate;
      body.amountTva = Math.round((ht * rate / 100) * 100) / 100;
      body.amountTtc = Math.round((ht + Number(body.amountTva)) * 100) / 100;
    }
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const parsed = createOutflowSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Données de décaissement invalides." },
      { status: 400 }
    );
  }

  try {
    const outflow = await createOrSyncOutflow({
      beneficiaryName: parsed.data.beneficiaryName,
      beneficiaryEmail: parsed.data.beneficiaryEmail || null,
      reason: parsed.data.reason,
      description: parsed.data.description || null,
      category: parsed.data.category || null,
      originModule: parsed.data.originModule as OutflowOriginModule,
      amountHt: parsed.data.amountHt,
      amountTvaRate: parsed.data.amountTvaRate,
      amountTva: parsed.data.amountTva,
      amountTtc: parsed.data.amountTtc,
      currency: parsed.data.currency,
      paymentMethod: parsed.data.paymentMethod || null,
      paymentSource: parsed.data.paymentSource || null,
      referenceNumber: parsed.data.referenceNumber || null,
      documentUrl: parsed.data.documentUrl || null,
      documentId: documentId || parsed.data.documentId || null,
      documentName,
      documentMimeType,
      documentData,
      createdById: owner.id,
      authorizedById: owner.id,
      operationDate: parsed.data.operationDate ? new Date(parsed.data.operationDate) : new Date(),
      paymentDate: parsed.data.paymentDate ? new Date(parsed.data.paymentDate) : null,
      status: parsed.data.status as OutflowStatus,
      reconciliationStatus: parsed.data.reconciliationStatus,
      isPrivateOwnerExpense: parsed.data.isPrivateOwnerExpense,
      actorRole: "OWNER",
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: owner.id,
        actorRole: "OWNER",
        action: "CREATE_FINANCIAL_OUTFLOW",
        targetType: "FINANCIAL_OUTFLOW",
        targetId: outflow.id,
        details: {
          outflowNumber: outflow.outflowNumber,
          amountTtc: outflow.amountTtc,
          beneficiaryName: outflow.beneficiaryName,
          status: outflow.status,
        },
      },
    });

    const { documentData: _documentData, ...outflowResponse } = outflow;

    return NextResponse.json(
      { outflow: outflowResponse, message: "Sortie d'argent enregistrée avec succès dans le registre comptable." },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("[outflow create error]", error);
    const msg = error instanceof Error ? error.message : "Erreur lors de l'enregistrement de la sortie d'argent.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
