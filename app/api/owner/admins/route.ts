import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { validatePassword } from "@/lib/password-policy";
import { z } from "zod";

const createStaffSchema = z.object({
  name: z.string().trim().min(2, "Nom trop court").max(120),
  email: z.string().trim().email("Email invalide").max(320),
  password: z.string(),
  role: z.enum(["ADMIN", "CONSULTANT"]),
});
const updateStaffSchema = z.object({
  userId: z.string().min(1),
  action: z.enum(["SUSPEND", "REACTIVATE", "REVOKE"]),
  reason: z.string().trim().min(5, "Le motif de modification est obligatoire (5 caractères minimum)."),
});
async function requireOwner() {
  const activeSession = getActiveSessionContext();
  const session = activeSession || (await auth());
  if (!session?.user?.id || session.user.role !== "OWNER") return null;
  return session.user.id;
}
export async function GET(request: Request) {
  const ownerId = await requireOwner();
  if (!ownerId) return NextResponse.json({ error: "Accès réservé à l'Owner" }, { status: 403 });
  const roleFilter = new URL(request.url).searchParams.get("role");
  const role = roleFilter === "ADMIN" || roleFilter === "CONSULTANT" ? roleFilter : undefined;
  const users = await prisma.user.findMany({
    where: role ? { role } : { role: { in: ["ADMIN", "CONSULTANT"] } }, orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
  });
  return NextResponse.json({ users });
}
export async function POST(request: Request) {
  const ownerId = await requireOwner();
  if (!ownerId) return NextResponse.json({ error: "Accès réservé à l'Owner" }, { status: 403 });
  let body: unknown; try { body = await request.json(); } catch { return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 }); }
  const parsed = createStaffSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Données invalides." }, { status: 400 });
  const passVal = validatePassword(parsed.data.password);
  if (!passVal.isValid) return NextResponse.json({ error: `Le mot de passe ne respecte pas la politique de sécurité : ${passVal.errors.join(" ")}` }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, role: true, status: true, candidat: { select: { id: true } } },
  });

  // OWNER-only staff creation may reuse an existing candidate account.
  // Preserve the CandidateProfile, applications, documents and history.
  if (existingUser) {
    if (existingUser.role !== "CANDIDAT" || !existingUser.candidat) {
      return NextResponse.json({ error: "Cette adresse email est déjà utilisée par un membre de l'équipe." }, { status: 409 });
    }
    const updatedUser = await prisma.user.update({
      where: { id: existingUser.id },
      data: { name: parsed.data.name, passwordHash: await hashPassword(parsed.data.password), role: parsed.data.role, status: "ACTIVE" },
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
    });
    await prisma.$executeRaw`INSERT INTO "SystemSetting" ("id", "key", "value", "createdAt", "updatedAt") VALUES (${`perm_${updatedUser.id}`}, ${`permissions:${updatedUser.id}`}, ${JSON.stringify([])}::jsonb, NOW(), NOW()) ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW()`;
    await prisma.auditLog.create({
      data: { actorUserId: ownerId, actorRole: "OWNER", action: `PROMOTE_CANDIDAT_TO_${parsed.data.role}`, targetType: "USER", targetId: updatedUser.id,
        details: { email: updatedUser.email, role: updatedUser.role, candidateProfilePreserved: true, permissionsInitialized: true } },
    });
    return NextResponse.json({ user: updatedUser, candidateProfilePreserved: true }, { status: 201 });
  }
  const newUser = await prisma.user.create({
    data: { name: parsed.data.name, email, passwordHash: await hashPassword(parsed.data.password), role: parsed.data.role, status: "ACTIVE" },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
  });
  // A newly created staff member starts with NO granular permissions.
  // Use the existing SystemSetting table directly so this remains compatible
  // with the generated Prisma client on the current platform baseline.
  await prisma.$executeRaw`INSERT INTO "SystemSetting" ("id", "key", "value", "createdAt", "updatedAt") VALUES (${`perm_${newUser.id}`}, ${`permissions:${newUser.id}`}, ${JSON.stringify([])}::jsonb, NOW(), NOW())`;
  await prisma.auditLog.create({
    data: { actorUserId: ownerId, actorRole: "OWNER", action: `CREATE_${parsed.data.role}`, targetType: "USER", targetId: newUser.id,
      details: { email: newUser.email, role: newUser.role, permissionsInitialized: true } },
  });
  return NextResponse.json({ user: newUser }, { status: 201 });
}
export async function PATCH(request: Request) {
  const ownerId = await requireOwner();
  if (!ownerId) return NextResponse.json({ error: "Accès réservé à l'Owner" }, { status: 403 });
  let body: unknown; try { body = await request.json(); } catch { return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 }); }
  const parsed = updateStaffSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Identifiant, action ou motif invalide." }, { status: 400 });
  const targetUser = await prisma.user.findUnique({ where: { id: parsed.data.userId }, select: { id: true, role: true, email: true, status: true } });
  if (!targetUser) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
  if (targetUser.role === "OWNER") return NextResponse.json({ error: "L'Owner suprême ne peut pas être modifié." }, { status: 403 });
  let newStatus = targetUser.status; let newRole = targetUser.role;
  if (parsed.data.action === "SUSPEND") newStatus = "SUSPENDED";
  else if (parsed.data.action === "REACTIVATE") newStatus = "ACTIVE";
  else { newStatus = "EXCLUDED"; newRole = "CANDIDAT"; }
  const updatedUser = await prisma.user.update({
    where: { id: targetUser.id }, data: { status: newStatus, role: newRole },
    select: { id: true, name: true, email: true, role: true, status: true },
  });
  if (parsed.data.action === "REVOKE") await prisma.systemSetting.deleteMany({ where: { key: `permissions:${targetUser.id}` } });
  await prisma.auditLog.create({
    data: { actorUserId: ownerId, actorRole: "OWNER", action: `${parsed.data.action}_${targetUser.role}`, targetType: "USER", targetId: targetUser.id,
      details: { previousStatus: targetUser.status, newStatus, previousRole: targetUser.role, newRole, reason: parsed.data.reason } },
  });
  return NextResponse.json({ user: updatedUser });
}
