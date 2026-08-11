import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import MessageCenter from "./MessageCenter";

export default async function MessagesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const users = await prisma.user.findMany({
    where: { id: { not: session.user.id } },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    take: 100,
    select: { id: true, name: true, email: true, role: true },
  });

  return <MessageCenter currentUserId={session.user.id} recipients={users} />;
}
