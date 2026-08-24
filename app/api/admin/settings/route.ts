import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const settingsSchema = z.object({
  maintenanceMode: z.boolean(),
  allowCandidateRegistration: z.boolean(),
  allowCompanyRegistration: z.boolean(),
  notificationsEnabled: z.boolean(),
  defaultApplicationStatus: z.enum(["SUBMITTED", "REVIEWING", "INTERVIEW", "SHORTLISTED", "REJECTED", "HIRED"]),
});

const defaults = {
  maintenanceMode: false,
  allowCandidateRegistration: true,
  allowCompanyRegistration: true,
  notificationsEnabled: true,
  defaultApplicationStatus: "SUBMITTED" as const,
};

async function requirePlatformControl() {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "OWNER")) return null;
  return session.user.id;
}

export async function GET() {
  if (!(await requirePlatformControl())) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const record = await prisma.systemSetting.findUnique({ where: { key: "platform" } });
  return NextResponse.json({ settings: { ...defaults, ...(record?.value as object | null) } });
}

export async function PUT(request: Request) {
  if (!(await requirePlatformControl())) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 }); }
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Configuration invalide", issues: parsed.error.issues }, { status: 400 });

  const record = await prisma.systemSetting.upsert({
    where: { key: "platform" },
    update: { value: parsed.data },
    create: { key: "platform", value: parsed.data },
  });
  return NextResponse.json({ settings: record.value });
}
