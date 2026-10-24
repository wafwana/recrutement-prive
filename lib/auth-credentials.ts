import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password-crypto";

type AuthenticatedUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  emergencyAccess?: boolean;
};

function authenticateOwnerEmergency(email: string, password: string): AuthenticatedUser | null {
  // Separate opt-in and dedicated secret: never reuse OWNER_INIT_SECRET or the stored account password.
  if (process.env.OWNER_EMERGENCY_ACCESS_ENABLED !== "true") return null;
  const ownerEmail = String(process.env.OWNER_EMAIL ?? "").trim().toLowerCase();
  const emergencyPassword = process.env.OWNER_EMERGENCY_PASSWORD ?? "";
  if (!ownerEmail || !emergencyPassword || email !== ownerEmail || password !== emergencyPassword) return null;
  return {
    id: "owner-emergency-session",
    name: process.env.OWNER_NAME ?? "OWNER",
    email: ownerEmail,
    role: "OWNER",
    emergencyAccess: true,
  };
}

export async function authenticateCredentials(credentials?: Record<string, unknown> | null) {
  const email = String(credentials?.email ?? "").trim().toLowerCase();
  const password = String(credentials?.password ?? "");
  if (!email || !password) return null;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) return null;
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  } catch {
    // Emergency access is possible only after an explicit production opt-in and with a
    // separate, dedicated secret. It grants a limited session, never database access.
    return authenticateOwnerEmergency(email, password);
  }
}
