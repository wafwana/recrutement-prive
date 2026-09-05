import { auth } from "@/auth";
import { handleGetCandidateDocument } from "./handler";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;
  const session = await auth();
  return handleGetCandidateDocument(documentId, session);
}
