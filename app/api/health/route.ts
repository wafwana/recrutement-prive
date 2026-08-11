import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, database: "up", latencyMs: Date.now() - startedAt }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, database: "down", latencyMs: Date.now() - startedAt }, { status: 503 });
  }
}
