import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password-crypto";

export async function authenticateCredentials(credentials?: Record<string, unknown> | null) {
  const email = String(credentials?.email ?? "").trim().toLowerCase();
  const password = String(credentials?.password ?? "");
  if (!email || !password) return null;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) return null;

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
