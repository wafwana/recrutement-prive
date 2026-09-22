import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const COLLABORATOR_ROLES = new Set(["ADMIN", "CONSULTANT"]);

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip") || null;
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  const role = session?.user?.role;
  if (!userId || !role || !COLLABORATOR_ROLES.has(role)) {
    return new NextResponse(null, { status: 204 });
  }

  let body: { sessionKey?: unknown; path?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }

  const sessionKey = typeof body.sessionKey === "string" ? body.sessionKey.trim() : "";
  const path = typeof body.path === "string" ? body.path.slice(0, 500) : "/";
  if (!sessionKey || sessionKey.length > 120) {
    return NextResponse.json({ error: "Session invalide." }, { status: 400 });
  }

  const now = new Date();
  const existing = await prisma.collaboratorActivitySession.findUnique({
    where: { sessionKey },
    select: { id: true, userId: true, lastSeenAt: true, activeSeconds: true },
  });

  const ipAddress = getClientIp(request);
  const country = request.headers.get("x-vercel-ip-country");
  const region = request.headers.get("x-vercel-ip-country-region");
  const city = request.headers.get("x-vercel-ip-city");
  const userAgent = request.headers.get("user-agent");

  if (!existing) {
    await prisma.collaboratorActivitySession.create({
      data: {
        userId,
        role,
        sessionKey,
        lastPath: path,
        ipAddress,
        country,
        region,
        city,
        userAgent,
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (existing.userId !== userId) {
    return NextResponse.json({ error: "Session non valide." }, { status: 403 });
  }

  const elapsed = Math.max(0, Math.floor((now.getTime() - existing.lastSeenAt.getTime()) / 1000));
  const activeIncrement = elapsed <= 90 ? elapsed : 0;

  await prisma.collaboratorActivitySession.update({
    where: { id: existing.id },
    data: {
      lastSeenAt: now,
      endedAt: null,
      lastPath: path,
      ipAddress,
      country,
      region,
      city,
      userAgent,
      activeSeconds: existing.activeSeconds + activeIncrement,
    },
  });

  return NextResponse.json({ ok: true });
}
