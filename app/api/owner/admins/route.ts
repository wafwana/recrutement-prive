import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { z } from "zod";

const adminSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  password: z.string().min(12).max(200),
});

async function requireOwner() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "OWNER") return null;
  return session.user.id;
}

export async function GET() {
  if (!(await requireOwner())) return NextResponse.json({ error: "Accès réservé à l'Owner" }, { status: 403 });
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, createdAt: true },
  });
  return NextResponse.json({ admins });
}

export async function POST(request: Request) {
  const ownerId = await requireOwner();
  if (!ownerId) return NextResponse.json({ error: "Accès réservé à l'Owner" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = adminSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Nom, email ou mot de passe invalide.", issues: parsed.error.issues }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
  if (existingUser) return NextResponse.json({ error: "Cette adresse email est déjà utilisée par un compte." }, { status: 409 });

  const admin = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash: await hashPassword(parsed.data.password),
      role: "ADMIN",
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json({ admin }, { status: 201 });
}
