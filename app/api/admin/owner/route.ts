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

  const email = parsed.data.email.toLowerCase();
  const result = await prisma.$transaction(async (tx) => {
    // Serialize Owner provisioning so two simultaneous Admin requests cannot create two Owners.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('recrutement-prive:owner-provisioning'))`;

    const existingOwner = await tx.user.findFirst({ where: { role: "OWNER" }, select: { id: true, email: true } });
    if (existingOwner) return { conflict: `Un Owner existe déjà (${existingOwner.email}). Aucun second Owner n'est autorisé.` };

    const existingUser = await tx.user.findUnique({ where: { email }, select: { id: true, role: true } });
    if (existingUser) return { conflict: "Cette adresse email est déjà utilisée par un autre compte." };

    const created = await tx.user.create({
      data: {
        name: parsed.data.name,
        email,
        passwordHash: await hashPassword(parsed.data.password),
        role: "OWNER",
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return { owner: created };
  });

  if ("conflict" in result) return NextResponse.json({ error: result.conflict }, { status: 409 });
  return NextResponse.json({ owner: result.owner }, { status: 201 });
}
