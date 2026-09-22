import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompanyAccess } from "@/lib/company-access";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const access = await requireCompanyAccess(params.get("companyId") ?? undefined);
    const q = params.get("q")?.trim().toLowerCase();
    const jobs = await prisma.job.findMany({
      where: { companyId: access.companyId, ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { folderPath: { contains: q, mode: "insensitive" } }] } : {}) },
      select: { id: true, title: true, status: true, location: true, folderPath: true, analyzedAt: true, analysis: true, jobCategory: { select: { code: true, name: true } }, subCategory: { select: { code: true, name: true } } },
      orderBy: { updatedAt: "desc" }
    });
    return NextResponse.json({ jobs, folders: [...new Set(jobs.map((job) => job.folderPath))] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Accès refusé" }, { status: 403 });
  }
}
