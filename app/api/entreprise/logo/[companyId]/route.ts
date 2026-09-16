import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const activeSession = getActiveSessionContext();
  const session = activeSession || (await auth());

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const { companyId } = await params;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      logoMimeType: true,
      logoData: true,
    },
  });

  if (!company || !company.logoData || !company.logoMimeType) {
    return NextResponse.json({ error: "Logo introuvable." }, { status: 404 });
  }

  return new Response(Buffer.from(company.logoData), {
    headers: {
      "Content-Type": company.logoMimeType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
