import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { hashPassword } from "@/lib/password-crypto";
import { prisma } from "@/lib/prisma";

const AI_ENV_KEYS = ["AI_PROVIDER", "OPENAI_API_KEY", "GEMINI_API_KEY"] as const;
const PORT = 3187;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const PASSWORD = "Synthetic-E2E-Owner-2026!";

function setCookiesFromResponse(response: Response, jar: Map<string, string>) {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const setCookies = headers.getSetCookie?.() ??
    (response.headers.get("set-cookie") ? [response.headers.get("set-cookie") as string] : []);
  for (const header of setCookies) {
    const pair = header.split(";", 1)[0];
    const separator = pair.indexOf("=");
    if (separator > 0) jar.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
}

function cookieHeader(jar: Map<string, string>) {
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function waitForServer(child: ReturnType<typeof spawn>, getOutput: () => string) {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (child.exitCode !== null) {
      throw new Error(`Next.js server exited before readiness (code ${child.exitCode}).\n${getOutput()}`);
    }
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.status === 200) {
        const health = await response.json() as { ok?: boolean; database?: string };
        if (health.ok && health.database === "up") return;
      }
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Next.js server did not become ready within 60 seconds.\n${getOutput()}`);
}

async function main() {
  const suffix = Date.now().toString();
  const email = `e2e.owner.http.${suffix}@example.test`;
  const pdfBytes = await readFile("tests/fixtures/cv/synthetic-cv.pdf");
  const sha256 = createHash("sha256").update(pdfBytes).digest("hex");
  const originalAiEnv = Object.fromEntries(AI_ENV_KEYS.map((key) => [key, process.env[key]]));
  let ownerId: string | null = null;
  let child: ReturnType<typeof spawn> | null = null;
  let serverOutput = "";
  const jar = new Map<string, string>();

  // Force deterministic local CV analysis and guarantee no outbound AI calls.
  for (const key of AI_ENV_KEYS) delete process.env[key];

  try {
    const owner = await prisma.user.create({
      data: {
        name: "Synthetic HTTP E2E Owner",
        email,
        role: "OWNER",
        passwordHash: await hashPassword(PASSWORD),
      },
      select: { id: true, email: true, name: true },
    });
    ownerId = owner.id;

    child = spawn(process.execPath, [
      "node_modules/next/dist/bin/next",
      "start",
      "-H", "127.0.0.1",
      "-p", String(PORT),
    ], {
      env: {
        ...process.env,
        PORT: String(PORT),
        HOSTNAME: "127.0.0.1",
        AUTH_SECRET: process.env.AUTH_SECRET || "ci-http-e2e-secret-32-characters-minimum",
        AUTH_URL: BASE_URL,
        NEXTAUTH_URL: BASE_URL,
        MAINTENANCE_MODE: "false",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout?.on("data", (chunk: Buffer) => { serverOutput = (serverOutput + chunk.toString()).slice(-12000); });
    child.stderr?.on("data", (chunk: Buffer) => { serverOutput = (serverOutput + chunk.toString()).slice(-12000); });

    await waitForServer(child, () => serverOutput);

    // Exercise the same CSRF + Credentials endpoints used by the production sign-in form.
    const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`);
    assert.equal(csrfResponse.status, 200, "Auth.js CSRF endpoint must be available");
    setCookiesFromResponse(csrfResponse, jar);
    const csrfBody = await csrfResponse.json() as { csrfToken?: string };
    assert.ok(csrfBody.csrfToken, "Auth.js must issue a CSRF token");
    assert.ok(cookieHeader(jar).length > 0, "CSRF cookie must be retained");

    const loginResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: "POST",
      redirect: "manual",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": cookieHeader(jar),
        "X-Auth-Return-Redirect": "1",
      },
      body: new URLSearchParams({
        csrfToken: csrfBody.csrfToken,
        email,
        password: PASSWORD,
        callbackUrl: `${BASE_URL}/espace`,
        json: "true",
      }),
    });
    setCookiesFromResponse(loginResponse, jar);
    assert.ok(
      loginResponse.status === 200 || loginResponse.status === 302 || loginResponse.status === 303,
      `Credentials callback returned unexpected HTTP ${loginResponse.status}: ${(await loginResponse.clone().text()).slice(0, 500)}`,
    );

    const sessionResponse = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: { Cookie: cookieHeader(jar) },
    });
    assert.equal(sessionResponse.status, 200);
    const session = await sessionResponse.json() as { user?: { id?: string; email?: string; role?: string } } | null;
    assert.equal(session?.user?.id, owner.id, "Real Auth.js session cookie must resolve the test Owner");
    assert.equal(session?.user?.role, "OWNER", "Auth.js must preserve the OWNER role in the signed session");

    // Upload a synthetic PDF through the real HTTP route, with the real signed session cookie.
    const formData = new FormData();
    formData.set("file", new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" }), "synthetic-cv.pdf");
    const uploadResponse = await fetch(`${BASE_URL}/api/owner/cv-intake`, {
      method: "POST",
      headers: { Cookie: cookieHeader(jar) },
      body: formData,
    });
    const uploadText = await uploadResponse.clone().text();
    assert.equal(uploadResponse.status, 201, `Authenticated CV upload failed: ${uploadText.slice(0, 800)}`);
    const uploadBody = JSON.parse(uploadText) as { ok: boolean; document?: { id: string; name: string }; candidateId?: string | null };
    assert.equal(uploadBody.ok, true);
    assert.ok(uploadBody.document?.id);
    assert.equal(uploadBody.document?.name, "synthetic-cv.pdf");
    assert.equal(uploadBody.candidateId ?? null, null, "Synthetic CV must not create or attach a candidate identity");

    const persisted = await prisma.cvIntake.findUnique({ where: { id: uploadBody.document.id } });
    assert.ok(persisted, "Uploaded CV must persist in the database");
    assert.equal(persisted.originalSha256, sha256);
    assert.deepEqual(Buffer.from(persisted.fileData), pdfBytes, "Stored original must match the uploaded bytes");
    assert.equal(persisted.status, "ANALYSE_OK", "Synthetic PDF must complete deterministic local analysis");
    assert.ok(persisted.analyzedAt);
    assert.ok(persisted.analysis && typeof persisted.analysis === "object");
    assert.ok(persisted.matching && typeof persisted.matching === "object");
    const analysis = persisted.analysis as Record<string, unknown>;
    assert.equal(analysis.sourceFactsOnly, true);
    assert.ok(Array.isArray(analysis.skills));

    const listResponse = await fetch(
      `${BASE_URL}/api/owner/cv-intake?q=${encodeURIComponent("synthetic-cv.pdf")}`,
      { headers: { Cookie: cookieHeader(jar) } },
    );
    assert.equal(listResponse.status, 200);
    const listBody = await listResponse.json() as { documents: Array<{ id: string; status: string; analysis: unknown; matching: unknown }>; folders: string[] };
    const visible = listBody.documents.find((item) => item.id === uploadBody.document?.id);
    assert.ok(visible, "Uploaded CV must be visible in the authenticated list");
    assert.equal(visible.status, "ANALYSE_OK");
    assert.ok(visible.analysis);
    assert.ok(visible.matching);
    assert.ok(listBody.folders.includes(persisted.folderPath));

    const audit = await prisma.auditLog.findFirst({
      where: { action: "CV_REAL_IMPORT", targetType: "CV_INTAKE", targetId: persisted.id },
      select: { details: true },
    });
    assert.ok(audit, "CV import must produce an audit entry");
    assert.equal((audit.details as Record<string, unknown>).analysisGenerated, true);

    // Read-only check of the OWNER outflows API against the fully migrated CI schema.
    const outflowsResponse = await fetch(`${BASE_URL}/api/owner/outflows`, {
      headers: { Cookie: cookieHeader(jar) },
    });
    const outflowsText = await outflowsResponse.clone().text();
    assert.equal(outflowsResponse.status, 200, `Authenticated OWNER outflows query failed: ${outflowsText.slice(0, 800)}`);
    const outflowsBody = await outflowsResponse.json() as { outflows: unknown[]; summary: { count: number; totalHt: number; totalTva: number; totalTtc: number } };
    assert.ok(Array.isArray(outflowsBody.outflows));
    assert.equal(typeof outflowsBody.summary.count, "number");
    assert.equal(typeof outflowsBody.summary.totalTva, "number");

    console.log(JSON.stringify({
      ok: true,
      scenario: "real-authjs-http-owner-cv-intake",
      checks: {
        csrfEndpoint: true,
        credentialsLoginOverHttp: true,
        signedSessionCookieAndOwnerRole: true,
        authenticatedSyntheticPdfUpload: true,
        localAnalysisAndMatchingPersistence: true,
        resultVisibleOverAuthenticatedHttp: true,
        immutableOriginalAndSha256: true,
        auditTrail: true,
        ownerOutflowsReadAgainstMigratedSchema: true,
        noCandidateIdentityCreated: true,
        noExternalAiProviderCalled: true,
      },
    }, null, 2));
  } finally {
    if (ownerId) {
      const records = await prisma.cvIntake.findMany({
        where: { senderUserId: ownerId, originalSha256: sha256 },
        select: { id: true, candidateId: true },
      }).catch(() => []);
      const ids = [...new Set(records.map((record) => record.id))];
      if (ids.length) {
        await prisma.auditLog.deleteMany({ where: { action: "CV_REAL_IMPORT", targetId: { in: ids } } });
        await prisma.cvIntake.deleteMany({ where: { id: { in: ids } } });
      }
      const candidateIds = records.map((record) => record.candidateId).filter((id): id is string => Boolean(id));
      if (candidateIds.length) {
        await prisma.candidateDocument.deleteMany({ where: { candidateId: { in: candidateIds } } });
        await prisma.candidateProfile.deleteMany({ where: { id: { in: candidateIds } } });
      }
      await prisma.user.deleteMany({ where: { id: ownerId } });
    }
    if (child && child.exitCode === null) {
      child.kill("SIGTERM");
      await Promise.race([once(child, "exit"), new Promise((resolve) => setTimeout(resolve, 3000))]);
    }
    for (const key of AI_ENV_KEYS) {
      const original = originalAiEnv[key];
      if (typeof original === "string") process.env[key] = original;
      else delete process.env[key];
    }
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
