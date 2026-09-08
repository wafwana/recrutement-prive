import { auth, getActiveSessionContext } from "@/auth";
import { handleGetCandidateDocument } from "./handler";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;
  let session = getActiveSessionContext();
  if (!session) {
    try {
      session = await auth();
    } catch {
      // Fallback when executed outside Next.js request store context (e.g. test environment)
    }
  }
  return handleGetCandidateDocument(documentId, session);
}
