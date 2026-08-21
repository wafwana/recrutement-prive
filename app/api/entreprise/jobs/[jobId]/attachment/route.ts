import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireCompanyAccess } from "@/lib/company-access";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ENTREPRISE") return new Response("Unauthorized", { status: 401 });

  const { jobId } = await params;
  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { companyId: true } });
  if (!job) return new Response("Not found", { status: 404 });

  try {
    const access = await requireCompanyAccess(job.companyId);
    const attachment = await prisma.job.findFirst({
      where: { id: jobId, companyId: access.companyId },
      select: { attachmentName: true, attachmentMimeType: true, attachmentData: true },
    });
    if (!attachment?.attachmentData || !attachment.attachmentName) return new Response("Attachment not found", { status: 404 });

    const filename = attachment.attachmentName.replace(/[\r\n"\\]/g, "_");
    const body = attachment.attachmentData.slice().buffer as ArrayBuffer;
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": attachment.attachmentMimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Forbidden", { status: 403 });
  }
}
