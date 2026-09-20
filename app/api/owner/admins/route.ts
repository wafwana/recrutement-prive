import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { validatePassword } from "@/lib/password-policy";
import { z } from "zod";
import { PERMISSIONS } from "@/lib/auth/permissions";

const createStaffSchema = z.object({
  name: z.string().trim().min(2, "Nom trop court").max(120),
  email: z.string().trim().email("Email invalide").max(320),
  password: z.string(),
  role: z.enum(["ADMIN", "CONSULTANT"]),
});

const updateStaffSchema = z.object({
  userId: z.string().min(1),
  action: z.enum(["SUSPEND", "REACTIVATE", "REVOKE", "SET_PERMISSIONS"]),
  reason: z.string().trim().min(5, "Le motif de modification est obligatoire (5 caractères minimum)."),
  permissions: z.array(z.enum(PERMISSIONS)).optional(),
});

async function requireOwner() {
  const activeSession = getActiveSessionContext();
  const session = activeSession || (await auth());
  if (!session?.user?.id || session.user.role !== "OWNER") return null;
  return session.user.id;
}

export async function GET() {
  const ownerId = await requireOwner();
  if (!ownerId) return NextResponse.json({ error: "Accès réservé à l'Owner" }, { status: 403 });

  const users = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "CONSULTANT"] } },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
  });
  const permissionRecords = await prisma.systemSetting.findMany({
    where: { key: { in: users.map((user) => `permissions:${user.id}`) } },
    select: { key: true, value: true },
  });
  const permissionsByUser = new Map(permissionRecords.map((record) => [record.key.slice("permissions:".length), record.value]));
  return NextResponse.json({
    users: users.map((user) => ({
      ...user,
      permissions: Array.isArray(permissionsByUser.get(user.id)) ? permissionsByUser.get(user.id) : [],
    })),
    availablePermissions: PERMISSIONS,
  });
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

  const parsed = createStaffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Données invalides." },
      { status: 400 }
    );
  }

  const passVal = validatePassword(parsed.data.password);
  if (!passVal.isValid) {
    return NextResponse.json(
      { error: `Le mot de passe ne respecte pas la politique de sécurité : ${passVal.errors.join(" ")}` },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
  if (existingUser) {
    return NextResponse.json({ error: "Cette adresse email est déjà utilisée." }, { status: 409 });
  }

  const newUser = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash: await hashPassword(parsed.data.password),
      role: parsed.data.role,
      status: "ACTIVE",
    },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: ownerId,
      actorRole: "OWNER",
      action: `CREATE_${parsed.data.role}`,
      targetType: "USER",
      targetId: newUser.id,
      details: { email: newUser.email, role: newUser.role },
    },
  });

  return NextResponse.json({ user: newUser }, { status: 201 });
}

export async function PATCH(request: Request) {
  const ownerId = await requireOwner();
  if (!ownerId) return NextResponse.json({ error: "Accès réservé à l'Owner" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = updateStaffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Identifiant, action ou motif invalide." }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, role: true, email: true, status: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
  }

  // PLATFORM GOVERNANCE RULE: ADMINs or target cannot alter the OWNER or elevate to OWNER
  if (targetUser.role === "OWNER") {
    return NextResponse.json({ error: "L'Owner suprême ne peut pas être modifié." }, { status: 403 });
  }

  if (parsed.data.action === "SET_PERMISSIONS") {
    if (targetUser.role === "CANDIDAT") {
      return NextResponse.json({ error: "Les permissions déléguées concernent uniquement ADMIN et CONSULTANT." }, { status: 400 });
    }
    if (!parsed.data.permissions) {
      return NextResponse.json({ error: "La matrice de permissions est obligatoire." }, { status: 400 });
    }
    await prisma.systemSetting.upsert({
      where: { key: `permissions:${targetUser.id}` },
      update: { value: parsed.data.permissions },
      create: { key: `permissions:${targetUser.id}`, value: parsed.data.permissions },
    });
    await prisma.auditLog.create({
      data: {
        actorUserId: ownerId,
        actorRole: "OWNER",
        action: "SET_PERMISSIONS",
        targetType: "USER",
        targetId: targetUser.id,
        details: { permissions: parsed.data.permissions, reason: parsed.data.reason },
      },
    });
    return NextResponse.json({ ok: true, userId: targetUser.id, permissions: parsed.data.permissions });
  }

  let newStatus = targetUser.status;
  let newRole = targetUser.role;
  if (parsed.data.action === "SUSPEND") {
    newStatus = "SUSPENDED";
  } else if (parsed.data.action === "REACTIVATE") {
    newStatus = "ACTIVE";
  } else if (parsed.data.action === "REVOKE") {
    newStatus = "EXCLUDED";
    newRole = "CANDIDAT"; // Revert to basic user role if revoked
  }

  const updatedUser = await prisma.user.update({
    where: { id: targetUser.id },
    data: { status: newStatus, role: newRole },
    select: { id: true, name: true, email: true, role: true, status: true },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: ownerId,
      actorRole: "OWNER",
      action: `${parsed.data.action}_${targetUser.role}`,
      targetType: "USER",
      targetId: targetUser.id,
      details: {
        previousStatus: targetUser.status,
        newStatus,
        previousRole: targetUser.role,
        newRole,
        reason: parsed.data.reason,
      },
    },
  });

  return NextResponse.json({ user: updatedUser });
}
