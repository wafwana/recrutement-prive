import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { z } from "zod";

const ownerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  password: z.string().min(12).max(200),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") return null;
  return session.user.id;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const owner = await prisma.user.findFirst({ where: { role: "OWNER" }, select: { id: true, name: true, email: true, createdAt: true } });
  return NextResponse.json({ owner });
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = ownerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Nom, email ou mot de passe invalide.", issues: parsed.error.issues }, { status: 400 });

  const owner = await prisma.user.findFirst({ where: { role: "OWNER" }, select: { id: true, email: true } });
  if (owner) return NextResponse.json({ error: `Un Owner existe déjà (${owner.email}). Aucun second Owner n'est autorisé.` }, { status: 409 });

  const email = parsed.data.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
  if (existingUser) return NextResponse.json({ error: "Cette adresse email est déjà utilisée par un autre compte." }, { status: 409 });

  const created = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash: await hashPassword(parsed.data.password),
      role: "OWNER",
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json({ owner: created }, { status: 201 });
}
