import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ingestGlobalCandidates, refreshProactiveCandidatePool } from "@/lib/sourcing/ingest";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const owner = await prisma.user.findFirst({
    where: { role: "OWNER", status: "ACTIVE" },
    select: { id: true },
  });

  if (!owner) {
    return NextResponse.json({ error: "OWNER actif introuvable." }, { status: 503 });
  }

  const result = await ingestGlobalCandidates({
    actorUserId: owner.id,
  });
  const proactive = await refreshProactiveCandidatePool(owner.id);

  return NextResponse.json({ ...result, proactive });
}
