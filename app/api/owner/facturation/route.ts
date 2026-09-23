import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";

async function requireBillingAccess() {
  const activeSession = getActiveSessionContext();
  const session = activeSession || (await auth());
  const userId = typeof session?.user?.id === "string" ? session.user.id : undefined;
  const role = typeof session?.user?.role === "string" ? session.user.role : undefined;
  if (!userId || !["OWNER", "ADMIN", "CONSULTANT"].includes(role || "")) return null;
  if (!(await hasPermission(userId, role, "FACTURATION"))) return null;
  return { id: userId, role: role || "" };
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function invoiceNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `RP-${stamp}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function GET() {
  const actor = await requireBillingAccess();
  if (!actor) return NextResponse.json({ error: "Permission FACTURATION non accordée par l’Owner." }, { status: 403 });

  const [invoices, companies, jobs, presentations] = await Promise.all([
    prisma.recruitmentInvoice.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        company: { select: { id: true, name: true, country: true } },
        job: { select: { id: true, title: true } },
        presentation: { select: { id: true, presentedAt: true, candidate: { select: { id: true, headline: true, user: { select: { name: true, email: true } } } } } },
        payments: { orderBy: { paidAt: "desc" }, select: { id: true, amount: true, paidAt: true, method: true, reference: true } },
      },
    }),
    prisma.company.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true, country: true } }),
    prisma.job.findMany({ where: { status: { in: ["OPEN", "PAUSED", "CLOSED"] } }, orderBy: { updatedAt: "desc" }, take: 200, select: { id: true, title: true, companyId: true, missionType: true, financialCondition: true } }),
    prisma.missionPresentation.findMany({
      where: { state: { not: "MISSION_TERMINEE" } },
      orderBy: { presentedAt: "desc" },
      take: 200,
      select: { id: true, missionId: true, companyId: true, candidateId: true, presentedAt: true, state: true, financialConditionStatus: true,
        mission: { select: { title: true } },
        company: { select: { name: true } },
        candidate: { select: { headline: true, user: { select: { name: true, email: true } } } },
      },
    }),
  ]);

  return NextResponse.json({ invoices, companies, jobs, presentations });
}

export async function POST(request: Request) {
  const actor = await requireBillingAccess();
  if (!actor) return NextResponse.json({ error: "Permission FACTURATION non accordée par l’Owner." }, { status: 403 });

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON invalide." }, { status: 400 }); }

  try {
    if (body.action === "CREATE_RULE") {
      const jobId = String(body.jobId || "");
      if (!jobId) return NextResponse.json({ error: "Mission obligatoire." }, { status: 400 });
      const billingType = String(body.billingType || "PERCENTAGE_SALARY");
      const fixedAmountHt = body.fixedAmountHt == null ? null : Number(body.fixedAmountHt);
      const percentage = body.percentage == null ? null : Number(body.percentage);
      if (fixedAmountHt !== null && (!Number.isFinite(fixedAmountHt) || fixedAmountHt < 0)) return NextResponse.json({ error: "Forfait HT invalide." }, { status: 400 });
      if (percentage !== null && (!Number.isFinite(percentage) || percentage < 0)) return NextResponse.json({ error: "Pourcentage invalide." }, { status: 400 });
      const rule = await prisma.recruitmentBillingRule.create({
        data: { jobId, billingType, fixedAmountHt, percentage, vatRate: Number(body.vatRate ?? 20), currency: String(body.currency || "EUR"), paymentTerms: body.paymentTerms || null },
      });
      await prisma.auditLog.create({ data: { actorUserId: actor.id, actorRole: actor.role, action: "CREATE_BILLING_RULE", targetType: "RECRUITMENT_BILLING_RULE", targetId: rule.id, details: { jobId, billingType } } });
      return NextResponse.json({ rule }, { status: 201 });
    }

    if (body.action === "RECORD_PAYMENT") {
      const invoiceId = String(body.invoiceId || "");
      const amount = Number(body.amount);
      if (!invoiceId || !Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Facture et montant de paiement obligatoires." }, { status: 400 });
      const invoice = await prisma.recruitmentInvoice.findUnique({ where: { id: invoiceId }, include: { payments: true } });
      if (!invoice) return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
      const alreadyPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
      if (round2(alreadyPaid + amount) > round2(invoice.amountTtc)) return NextResponse.json({ error: "Le paiement dépasse le solde de la facture." }, { status: 400 });
      const payment = await prisma.$transaction(async (tx) => {
        const created = await tx.recruitmentInvoicePayment.create({ data: { invoiceId, amount: round2(amount), method: String(body.method || "VIREMENT"), reference: body.reference ? String(body.reference) : null, notes: body.notes ? String(body.notes) : null } });
        const totalPaid = round2(alreadyPaid + amount);
        await tx.recruitmentInvoice.update({ where: { id: invoiceId }, data: { status: totalPaid >= invoice.amountTtc ? "PAID" : "PARTIALLY_PAID", paidAt: totalPaid >= invoice.amountTtc ? new Date() : null } });
        await tx.auditLog.create({ data: { actorUserId: actor.id, actorRole: actor.role, action: "RECORD_RECRUITMENT_PAYMENT", targetType: "RECRUITMENT_INVOICE", targetId: invoiceId, details: { amount: round2(amount), method: String(body.method || "VIREMENT") } } });
        return created;
      });
      return NextResponse.json({ payment });
    }

    if (body.action === "ISSUE_INVOICE") {
      const invoiceId = String(body.invoiceId || "");
      if (!invoiceId) return NextResponse.json({ error: "Facture obligatoire." }, { status: 400 });
      const invoice = await prisma.recruitmentInvoice.update({ where: { id: invoiceId }, data: { status: "ISSUED", issuedAt: new Date() } });
      await prisma.auditLog.create({ data: { actorUserId: actor.id, actorRole: actor.role, action: "ISSUE_RECRUITMENT_INVOICE", targetType: "RECRUITMENT_INVOICE", targetId: invoice.id, details: { invoiceNumber: invoice.invoiceNumber } } });
      return NextResponse.json({ invoice });
    }

    if (body.action !== "CREATE_INVOICE") return NextResponse.json({ error: "Action inconnue." }, { status: 400 });

    const companyId = String(body.companyId || "");
    const jobId = body.jobId ? String(body.jobId) : null;
    const presentationId = body.presentationId ? String(body.presentationId) : null;
    const amountHt = Number(body.amountHt);
    const vatRate = Number(body.vatRate ?? 20);
    if (!companyId || !Number.isFinite(amountHt) || amountHt <= 0) return NextResponse.json({ error: "Entreprise et montant HT obligatoires." }, { status: 400 });
    if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 100) return NextResponse.json({ error: "TVA invalide." }, { status: 400 });

    const amountTva = round2(amountHt * vatRate / 100);
    const amountTtc = round2(amountHt + amountTva);
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + Number(body.paymentDays ?? 30));
    const invoice = await prisma.recruitmentInvoice.create({
      data: {
        invoiceNumber: invoiceNumber(),
        companyId,
        jobId,
        presentationId,
        billingRuleId: body.billingRuleId ? String(body.billingRuleId) : null,
        description: String(body.description || "Honoraires de recrutement"),
        status: body.issueNow ? "ISSUED" : "DRAFT",
        amountHt: round2(amountHt),
        vatRate,
        amountTva,
        amountTtc,
        currency: String(body.currency || "EUR"),
        issuedAt: body.issueNow ? new Date() : null,
        dueAt,
        notes: body.notes ? String(body.notes) : null,
      },
    });
    await prisma.auditLog.create({ data: { actorUserId: actor.id, actorRole: actor.role, action: "CREATE_RECRUITMENT_INVOICE", targetType: "RECRUITMENT_INVOICE", targetId: invoice.id, details: { invoiceNumber: invoice.invoiceNumber, companyId, jobId, presentationId, amountHt: invoice.amountHt, amountTtc: invoice.amountTtc } } });
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    console.error("[billing] error", error);
    return NextResponse.json({ error: "Erreur lors de l’opération de facturation." }, { status: 500 });
  }
}
