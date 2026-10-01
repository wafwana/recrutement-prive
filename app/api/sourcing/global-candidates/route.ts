import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { ingestGlobalCandidates } from "@/lib/sourcing/ingest";
import { hasPermission } from "@/lib/auth/permissions";

async function requireStaffPermission() {
  const active = getActiveSessionContext();
  const session = active || (await auth());
  const userId = typeof session?.user?.id === "string" ? session.user.id : undefined;
  const role = typeof session?.user?.role === "string" ? session.user.role : undefined;
  if (!userId || !["OWNER", "ADMIN", "CONSULTANT"].includes(role ?? "")) return null;
  if (!(await hasPermission(userId, role, "SOURCING"))) return null;
  return userId;
}

export async function POST(request: Request) {
  const actor = await requireStaffPermission();
  if (!actor) return NextResponse.json({ error: "Permission de sourcing non accordée par l'Owner." }, { status: 403 });

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {}

  const sourceUrl = typeof body.sourceUrl === "string" && /^https:\/\//i.test(body.sourceUrl)
    ? body.sourceUrl
    : undefined;

  const jobId = typeof body.jobId === "string" && body.jobId ? body.jobId : undefined;
  const query = typeof body.query === "string" ? body.query : undefined;
  const country = typeof body.country === "string" ? body.country : undefined;
  const skills = Array.isArray(body.skills)
    ? body.skills.filter((s): s is string => typeof s === "string")
    : undefined;

  const result = await ingestGlobalCandidates({
    sourceUrl,
    filter: { query, skills, country, jobId },
    actorUserId: actor,
  });

  return NextResponse.json(result);
}
