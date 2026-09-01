import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCompanyAccess } from "@/lib/company-access";
import { validateUploadedDocument } from "@/lib/security/file-validation";
import { rateLimit } from "@/lib/security/rate-limit";
import { requireFileScanInProduction, scanBufferWithClamAV } from "@/lib/security/file-scan";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set(["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([".pdf", ".doc", ".docx"]);

const jobSchema = z.object({ companyId: z.string().optional(), title: z.string().trim().min(2).max(160), location: z.string().trim().max(160).optional(), description: z.string().trim().max(10000).optional(), missionType: z.string().trim().max(100).optional(), requiredSkills: z.string().trim().max(1500).optional(), requiredExperienceYears: z.coerce.number().int().min(0).max(60).optional(), status: z.enum(["DRAFT", "OPEN", "PAUSED", "CLOSED", "ARCHIVED"]).default("DRAFT") });

type JobInput = z.infer<typeof jobSchema>;
function text(value: FormDataEntryValue | null) { const result = String(value ?? "").trim(); return result || undefined; }
function csv(value: string | undefined) { return value ? value.split(",").map((item) => item.trim()).filter(Boolean) : []; }
function validateAttachment(value: FormDataEntryValue | null) {
  if (!(value instanceof File) || value.size === 0) return null;
  if (value.size > MAX_ATTACHMENT_SIZE) throw new Error("La pièce jointe dépasse la taille maximale de 10 Mo.");
  const name = value.name.trim();
  const extension = name.toLowerCase().slice(name.lastIndexOf("."));
  if (!ALLOWED_ATTACHMENT_EXTENSIONS.has(extension) || (value.type && !ALLOWED_ATTACHMENT_TYPES.has(value.type))) throw new Error("Format de pièce jointe non autorisé. Utilisez un fichier PDF, DOC ou DOCX.");
  return value;
}

export async function GET(request: Request) {
  try {
    const companyId = new URL(request.url).searchParams.get("companyId") ?? undefined;
    const access = await requireCompanyAccess(companyId);
    const jobs = await prisma.job.findMany({ where: { companyId: access.companyId }, include: { _count: { select: { applications: true } } }, orderBy: { updatedAt: "desc" } });
    return NextResponse.json(jobs);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Accès refusé" }, { status: 403 }); }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let parsed: ReturnType<typeof jobSchema.safeParse>;
    let attachment: File | null = null;
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      parsed = jobSchema.safeParse({ companyId: text(formData.get("companyId")), title: text(formData.get("title")), location: text(formData.get("location")), description: text(formData.get("description")), missionType: text(formData.get("missionType")), requiredSkills: text(formData.get("requiredSkills")), requiredExperienceYears: text(formData.get("requiredExperienceYears")), status: text(formData.get("status")) ?? "DRAFT" });
      attachment = validateAttachment(formData.get("attachment"));
    } else {
      const body: JobInput = await request.json();
      parsed = jobSchema.safeParse(body);
    }
    if (!parsed.success) return NextResponse.json({ error: "Données d'offre invalides" }, { status: 400 });
    const access = await requireCompanyAccess(parsed.data.companyId);
    const requestLimit = rateLimit(`company-job:create:${access.userId}`, 20, 60 * 60_000);
    if (!requestLimit.allowed) return NextResponse.json({ error: "Trop de créations d'offres. Merci de réessayer plus tard." }, { status: 429 });

    let attachmentData: Buffer | undefined;
    if (attachment) {
      const validation = await validateUploadedDocument(attachment);
      if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });
      attachmentData = Buffer.from(await attachment.arrayBuffer());
      if (requireFileScanInProduction()) {
        const scan = await scanBufferWithClamAV(attachmentData);
        if (scan.status === "infected") return NextResponse.json({ error: "La pièce jointe a été bloquée par le contrôle de sécurité." }, { status: 400 });
        if (scan.status === "unavailable") {
          console.error("[company-job] antivirus unavailable", scan.reason);
          return NextResponse.json({ error: "Le contrôle de sécurité de la pièce jointe est temporairement indisponible." }, { status: 503 });
        }
      }
    }

    const job = await prisma.$transaction(async (tx) => {
      const created = await tx.job.create({ data: { companyId: access.companyId, title: parsed.data.title, location: parsed.data.location || null, description: parsed.data.description || null, missionType: parsed.data.missionType || null, requiredSkills: csv(parsed.data.requiredSkills), requiredExperienceYears: parsed.data.requiredExperienceYears, ...(attachment ? { attachmentName: attachment.name.replace(/[\\/\r\n\0]/g, "_").slice(-180), attachmentMimeType: attachment.type || "application/octet-stream", attachmentData } : {}), status: parsed.data.status } });
      await tx.recruitmentHistory.create({ data: { jobId: created.id, actorUserId: access.userId, action: "JOB_CREATED", toStatus: created.status, details: attachment ? { attachmentName: attachment.name, attachmentSize: attachment.size } : undefined } });
      return created;
    });
    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impossible de créer l'offre";
    return NextResponse.json({ error: message }, { status: message.includes("accès") || message.includes("Access") ? 403 : 400 });
  }
}
