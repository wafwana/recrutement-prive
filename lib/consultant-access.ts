import { auth } from "@/auth";

export type ConsultantAccess = {
  userId: string;
};

export async function requireConsultantAccess(): Promise<ConsultantAccess> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CONSULTANT") {
    throw new Error("Accès consultant requis");
  }
  return { userId: session.user.id };
}
