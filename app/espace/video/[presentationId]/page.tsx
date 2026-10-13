import { auth } from "@/auth";
import { redirect } from "next/navigation";
import TrustedVideoRoom from "@/components/messaging/TrustedVideoRoom";

export default async function TrustedVideoPage({ params }: { params: Promise<{ presentationId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  const { presentationId } = await params;
  return <TrustedVideoRoom presentationId={presentationId} />;
}
