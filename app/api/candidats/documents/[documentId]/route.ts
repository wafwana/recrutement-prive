import { auth } from "@/auth";
import { handleGetCandidateDocument } from "./handler";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;
  let session = null;
  try {
    session = await auth();
  } catch {
    // Fallback when executed outside Next.js request store context (e.g. test environment)
  }
  return handleGetCandidateDocument(documentId, session);
}
