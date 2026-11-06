import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import { hashPassword, hashToken } from "@/lib/password-crypto";
import { prisma } from "@/lib/prisma";
import { ingestAnalyzedCvIntakes } from "@/lib/sourcing/ingest";
import { resetPassword } from "@/app/reinitialisation-mot-de-passe/actions";

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
  const emailsToClean: string[] = [];
  let ownerId: string | null = null;
  let adminId: string | null = null;
  let consultantId: string | null = null;
  let candidateUserId: string | null = null;
  let child: ReturnType<typeof spawn> | null = null;
  let serverOutput = "";
  const jar = new Map<string, string>();
  const adminJar = new Map<string, string>();
  const consultantJar = new Map<string, string>();

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
    const adminEmail = `e2e.admin.http.${suffix}@example.test`;
    emailsToClean.push(adminEmail);
    const admin = await prisma.user.create({
      data: {
        name: "Synthetic HTTP E2E Admin",
        email: adminEmail,
        role: "ADMIN",
        passwordHash: await hashPassword(PASSWORD),
      },
      select: { id: true },
    });
    adminId = admin.id;
    const consultantEmail = `e2e.consultant.http.${suffix}@example.test`;
    emailsToClean.push(consultantEmail);
    const consultant = await prisma.user.create({
      data: {
        name: "Synthetic HTTP E2E Consultant",
        email: consultantEmail,
        role: "CONSULTANT",
        passwordHash: await hashPassword(PASSWORD),
      },
      select: { id: true },
    });
    consultantId = consultant.id;

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
        RESEND_API_KEY: "mock_key",
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

    const adminCsrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`);
    setCookiesFromResponse(adminCsrfResponse, adminJar);
    const adminCsrf = await adminCsrfResponse.json() as { csrfToken?: string };
    assert.ok(adminCsrf.csrfToken);
    const adminLoginResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: "POST",
      redirect: "manual",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": cookieHeader(adminJar),
        "X-Auth-Return-Redirect": "1",
      },
      body: new URLSearchParams({
        csrfToken: adminCsrf.csrfToken,
        email: adminEmail,
        password: PASSWORD,
        callbackUrl: `${BASE_URL}/espace`,
        json: "true",
      }),
    });
    setCookiesFromResponse(adminLoginResponse, adminJar);
    assert.ok([200, 302, 303].includes(adminLoginResponse.status));
    const adminSessionResponse = await fetch(`${BASE_URL}/api/auth/session`, { headers: { Cookie: cookieHeader(adminJar) } });
    const adminSession = await adminSessionResponse.json() as { user?: { id?: string; role?: string } } | null;
    assert.equal(adminSession?.user?.id, admin.id);
    assert.equal(adminSession?.user?.role, "ADMIN");
    const consultantCsrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`);
    setCookiesFromResponse(consultantCsrfResponse, consultantJar);
    const consultantCsrf = await consultantCsrfResponse.json() as { csrfToken?: string };
    assert.ok(consultantCsrf.csrfToken);
    const consultantLoginResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: "POST",
      redirect: "manual",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": cookieHeader(consultantJar),
        "X-Auth-Return-Redirect": "1",
      },
      body: new URLSearchParams({
        csrfToken: consultantCsrf.csrfToken,
        email: consultantEmail,
        password: PASSWORD,
        callbackUrl: `${BASE_URL}/espace`,
        json: "true",
      }),
    });
    setCookiesFromResponse(consultantLoginResponse, consultantJar);
    assert.ok([200, 302, 303].includes(consultantLoginResponse.status));
    const consultantSessionResponse = await fetch(`${BASE_URL}/api/auth/session`, { headers: { Cookie: cookieHeader(consultantJar) } });
    const consultantSession = await consultantSessionResponse.json() as { user?: { id?: string; role?: string } } | null;
    assert.equal(consultantSession?.user?.id, consultant.id);
    assert.equal(consultantSession?.user?.role, "CONSULTANT");

    // Upload a synthetic PDF through the real HTTP route, with the real signed session cookie.
    const formData = new FormData();
    formData.set("file", new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" }), "synthetic-cv.pdf");
    const consentEmail = `cv-consent-e2e.${suffix}@example.test`;
    emailsToClean.push(consentEmail);
    formData.set("candidateName", "Synthetic CV Consent");
    formData.set("candidateEmail", consentEmail);
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
    assert.equal(await prisma.user.findUnique({ where: { email: consentEmail }, select: { id: true } }), null, "Import must not create a candidate account before consent");

    const persisted = await prisma.cvIntake.findUnique({ where: { id: uploadBody.document.id } });
    assert.ok(persisted, "Uploaded CV must persist in the database");
    assert.equal(persisted.originalSha256, sha256);
    assert.deepEqual(Buffer.from(persisted.fileData), pdfBytes, "Stored original must match the uploaded bytes");
    assert.equal(persisted.status, "A_ANALYSER", "CV must remain pending until OWNER consent");
    assert.equal(persisted.analyzedAt, null, "Import must not analyze before consent");
    assert.equal(persisted.analysis, null, "Import must not persist extracted candidate data before consent");
    assert.ok(persisted.matching && typeof persisted.matching === "object");
    assert.equal(((persisted.matching as Record<string, unknown>).consent as Record<string, unknown>).status, "PENDING");

    const listResponse = await fetch(
      `${BASE_URL}/api/owner/cv-intake?q=${encodeURIComponent("synthetic-cv.pdf")}`,
      { headers: { Cookie: cookieHeader(jar) } },
    );
    assert.equal(listResponse.status, 200);
    const listBody = await listResponse.json() as { documents: Array<{ id: string; status: string; analysis: unknown; matching: unknown }>; folders: string[] };
    const visible = listBody.documents.find((item) => item.id === uploadBody.document?.id);
    assert.ok(visible, "Uploaded CV must be visible in the authenticated list");
    assert.equal(visible.status, "A_ANALYSER");
    assert.equal(visible.analysis, null);
    assert.ok(visible.matching);
    assert.ok(listBody.folders.includes(persisted.folderPath));

    const audit = await prisma.auditLog.findFirst({
      where: { action: "CV_REAL_IMPORT", targetType: "CV_INTAKE", targetId: persisted.id },
      select: { details: true },
    });
    assert.ok(audit, "CV import must produce an audit entry");
    assert.equal((audit.details as Record<string, unknown>).analysisGenerated, false);

    // A manual retry before consent must skip extraction altogether.
    const pendingRetryResponse = await fetch(`${BASE_URL}/api/owner/cv-intake/reprocess`, {
      method: "POST",
      headers: { Cookie: cookieHeader(jar), "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [persisted.id] }),
    });
    assert.equal(pendingRetryResponse.status, 200);
    const pendingRetryBody = await pendingRetryResponse.json() as { ok: boolean; results: Array<{ id: string; status: string }> };
    assert.equal(pendingRetryBody.ok, true);
    assert.equal(pendingRetryBody.results[0]?.status, "SKIPPED_CONSENT_PENDING");
    const stillPending = await prisma.cvIntake.findUnique({ where: { id: persisted.id } });
    assert.equal(stillPending?.status, "A_ANALYSER");
    assert.equal(stillPending?.analysis, null, "Pending consent retry must not extract or store CV data");

    const inviteBeforeConsent = await fetch(`${BASE_URL}/api/owner/cv-intake/invite`, { method: "POST", headers: { Cookie: cookieHeader(jar), "Content-Type": "application/json" }, body: JSON.stringify({ intakeId: persisted.id }) });
    assert.equal(inviteBeforeConsent.status, 409, "Candidate invitation must be blocked before consent authorization");
    const provisionalBeforeConsent = await prisma.sourcedCandidate.findUnique({ where: { source_externalId: { source: "PLATFORM_CV_INTAKE", externalId: "cv-intake:" + persisted.id } } });
    assert.equal(provisionalBeforeConsent, null, "Pending-consent CV must not create a sourced candidate");

    const nonOwnerConsentResponse = await fetch(`${BASE_URL}/api/owner/cv-intake/${persisted.id}/consent`, { method: "POST", headers: { Cookie: cookieHeader(adminJar), "Content-Type": "application/json" }, body: JSON.stringify({ status: "AUTHORIZED", evidence: "E2E synthetic admin authorization attempt" }) });
    assert.equal(nonOwnerConsentResponse.status, 403, "ADMIN without CV_INTAKE permission must not authorize CV consent");
    const missingEvidenceResponse = await fetch(`${BASE_URL}/api/owner/cv-intake/${persisted.id}/consent`, { method: "POST", headers: { Cookie: cookieHeader(jar), "Content-Type": "application/json" }, body: JSON.stringify({ status: "AUTHORIZED", evidence: "   " }) });
    assert.equal(missingEvidenceResponse.status, 400, "Consent authorization without evidence must be rejected");
    const stillPendingAfterDeniedActions = await prisma.cvIntake.findUnique({ where: { id: persisted.id } });
    assert.equal((((stillPendingAfterDeniedActions?.matching as Record<string, unknown> | null)?.consent as Record<string, unknown> | undefined)?.status), "PENDING");

    for (const userId of [admin.id, consultant.id]) {
      const permissionResponse = await fetch(`${BASE_URL}/api/owner/permissions`, {
        method: "PUT",
        headers: { Cookie: cookieHeader(jar), "Content-Type": "application/json" },
        body: JSON.stringify({ userId, permissions: ["CV_INTAKE"], reason: "E2E CV consent delegation" }),
      });
      assert.equal(permissionResponse.status, 200, `OWNER must be able to grant CV_INTAKE to ${userId}`);
    }
    for (const delegatedJar of [adminJar, consultantJar]) {
      const delegatedListResponse = await fetch(`${BASE_URL}/api/owner/cv-intake`, { headers: { Cookie: cookieHeader(delegatedJar) } });
      assert.equal(delegatedListResponse.status, 200);
      const delegatedList = await delegatedListResponse.json() as { canManageConsent: boolean; canInviteCandidates: boolean; canReprocess: boolean };
      assert.equal(delegatedList.canManageConsent, true);
      assert.equal(delegatedList.canInviteCandidates, false, "Delegated CV_INTAKE permission must not grant candidate invitations");
      assert.equal(delegatedList.canReprocess, false, "Delegated CV_INTAKE permission must not grant OWNER-only CV reprocessing");
    }

    const consentResponse = await fetch(`${BASE_URL}/api/owner/cv-intake/${persisted.id}/consent`, { method: "POST", headers: { Cookie: cookieHeader(adminJar), "Content-Type": "application/json" }, body: JSON.stringify({ status: "AUTHORIZED", evidence: "E2E synthetic consent evidence verified by delegated ADMIN" }) });
    assert.equal(consentResponse.status, 200, `Authorized ADMIN consent failed: ${(await consentResponse.clone().text()).slice(0, 500)}`);
    const authorizationAudit = await prisma.auditLog.findFirst({
      where: { action: "CV_INTAKE_CONSENT_AUTHORIZED", targetType: "CV_INTAKE", targetId: persisted.id },
      select: { actorUserId: true, actorRole: true },
    });
    assert.equal(authorizationAudit?.actorUserId, admin.id);
    assert.equal(authorizationAudit?.actorRole, "ADMIN", "Delegated authorization must record the actual actor role");
    const authorizedPendingIntake = await prisma.cvIntake.findUnique({ where: { id: persisted.id } });
    assert.equal((((authorizedPendingIntake?.matching as Record<string, unknown> | null)?.consent as Record<string, unknown> | undefined)?.status), "AUTHORIZED");
    assert.equal(await prisma.sourcedCandidate.findUnique({ where: { source_externalId: { source: "PLATFORM_CV_INTAKE", externalId: "cv-intake:" + persisted.id } } }), null, "Authorization alone must not create a candidate projection before analysis");

    // Analysis and matching are now permitted; keep the operation local and preserve original bytes.
    const retryResponse = await fetch(`${BASE_URL}/api/owner/cv-intake/reprocess`, {
      method: "POST",
      headers: { Cookie: cookieHeader(jar), "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [persisted.id] }),
    });
    assert.equal(retryResponse.status, 200, `OWNER local reprocessing failed: ${(await retryResponse.clone().text()).slice(0, 500)}`);
    const retryBody = await retryResponse.json() as { ok: boolean; externalAiCalled: boolean; originalFilesModified: boolean; results: Array<{ id: string; status: string }> };
    assert.equal(retryBody.ok, true);
    assert.equal(retryBody.externalAiCalled, false, "Reprocessing must not call an external AI provider");
    assert.equal(retryBody.originalFilesModified, false);
    assert.equal(retryBody.results[0]?.status, "ANALYSE_OK");
    const retried = await prisma.cvIntake.findUnique({ where: { id: persisted.id } });
    assert.ok(retried?.analyzedAt, "Successful authorized reprocessing must set analyzedAt");
    assert.equal(retried?.originalSha256, sha256, "Reprocessing must preserve the original file hash");
    assert.equal(retried?.status, "ANALYSE_OK");
    const authorizedAnalysis = retried?.analysis as Record<string, unknown>;
    assert.equal(authorizedAnalysis.sourceFactsOnly, true);

    const provisionalAfterConsent = await prisma.sourcedCandidate.findUnique({ where: { source_externalId: { source: "PLATFORM_CV_INTAKE", externalId: "cv-intake:" + persisted.id } } });
    assert.ok(provisionalAfterConsent, "Authorized and analyzed CV must create one provisional sourced candidate");
    assert.equal(provisionalAfterConsent.consentStatus, "AUTHORIZED");
    assert.equal(provisionalAfterConsent.status, "DETECTED");

    const delegatedInvite = await fetch(`${BASE_URL}/api/owner/cv-intake/invite`, { method: "POST", headers: { Cookie: cookieHeader(adminJar), "Content-Type": "application/json" }, body: JSON.stringify({ intakeId: persisted.id }) });
    assert.equal(delegatedInvite.status, 403, "CV_INTAKE permission must not grant the OWNER-only invitation action");
    const inviteAfterConsent = await fetch(`${BASE_URL}/api/owner/cv-intake/invite`, { method: "POST", headers: { Cookie: cookieHeader(jar), "Content-Type": "application/json" }, body: JSON.stringify({ intakeId: persisted.id }) });
    assert.equal(inviteAfterConsent.status, 502, "Explicit invitation action should reach mail delivery after consent; CI has no mail provider configured");
    const invitedUser = await prisma.user.findUnique({
      where: { email: consentEmail },
      select: { id: true, candidat: { select: { id: true, status: true } } },
    });
    candidateUserId = invitedUser?.id || null;
    assert.ok(invitedUser?.candidat, "Candidate account/profile may be created only after the explicit Owner invitation action");
    const derivedDocument = await prisma.candidateDocument.findFirst({
      where: { candidateId: invitedUser.candidat.id, analysis: { path: ["sourceCvIntakeId"], equals: persisted.id } },
      select: { id: true },
    });
    assert.ok(derivedDocument, "Explicit invitation action should create the derived candidate CV copy");

    const pendingInvitationToken = randomBytes(32).toString("hex");
    const pendingInvitationTokenHash = hashToken(pendingInvitationToken);
    await prisma.passwordResetToken.create({
      data: { email: consentEmail, tokenHash: pendingInvitationTokenHash, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });
    const intakeBeforeTokenRevocation = await prisma.cvIntake.findUnique({ where: { id: persisted.id }, select: { matching: true } });
    await prisma.cvIntake.update({
      where: { id: persisted.id },
      data: { matching: { ...(intakeBeforeTokenRevocation?.matching as Record<string, unknown>), invitationStatus: "SENT", invitationTokenHash: pendingInvitationTokenHash } },
    });

    await prisma.cvIntake.update({ where: { id: persisted.id }, data: { status: "NON_ANALYSE" } });
    const [revokeResponse, raceReprocessResponse] = await Promise.all([
      fetch(`${BASE_URL}/api/owner/cv-intake/${persisted.id}/consent`, { method: "POST", headers: { Cookie: cookieHeader(consultantJar), "Content-Type": "application/json" }, body: JSON.stringify({ status: "REVOKED", evidence: "E2E synthetic consent revocation verified by delegated Consultant" }) }),
      fetch(`${BASE_URL}/api/owner/cv-intake/reprocess`, {
        method: "POST",
        headers: { Cookie: cookieHeader(jar), "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [persisted.id] }),
      }),
    ]);
    assert.equal(revokeResponse.status, 200, `Authorized CONSULTANT consent revocation failed: ${(await revokeResponse.clone().text()).slice(0, 500)}`);
    assert.equal(raceReprocessResponse.status, 200, "Concurrent local reprocessing should resolve safely against revocation");
    const revokedIntake = await prisma.cvIntake.findUnique({ where: { id: persisted.id } });
    const revokedCandidate = await prisma.sourcedCandidate.findUnique({ where: { id: provisionalAfterConsent.id } });
    const revokedProfile = await prisma.candidateProfile.findUnique({ where: { id: invitedUser.candidat.id }, select: { status: true, preferences: true } });
    assert.equal((((revokedIntake?.matching as Record<string, unknown> | null)?.consent as Record<string, unknown> | undefined)?.status), "REVOKED");
    assert.equal(revokedCandidate?.consentStatus, "REVOKED");
    assert.equal(revokedCandidate?.status, "REJECTED", "Revoked CV must leave the active sourcing/matching pool");
    assert.equal(revokedCandidate?.matchingScore, 0);
    assert.deepEqual((revokedCandidate?.matchingDetails as Record<string, unknown> | null)?.matchedOffers, []);
    assert.equal(revokedProfile?.status, "SUSPENDED", "Profile created from the import must be suspended on revocation");
    const revocationAudit = await prisma.auditLog.findFirst({
      where: { action: "CV_INTAKE_CONSENT_REVOKED", targetType: "CV_INTAKE", targetId: persisted.id },
      select: { actorUserId: true, actorRole: true },
    });
    assert.equal(revocationAudit?.actorUserId, consultant.id);
    assert.equal(revocationAudit?.actorRole, "CONSULTANT", "Delegated revocation must record the actual actor role");
    assert.equal(await prisma.candidateDocument.findFirst({ where: { candidateId: invitedUser.candidat.id, analysis: { path: ["sourceCvIntakeId"], equals: persisted.id } }, select: { id: true } }), null, "Revocation must remove the derived CV copy");
    assert.equal(await prisma.passwordResetToken.findUnique({ where: { tokenHash: pendingInvitationTokenHash }, select: { id: true } }), null, "Revocation must invalidate the pending invitation token");
    const resetFormData = new FormData();
    resetFormData.set("token", pendingInvitationToken);
    resetFormData.set("password", "Synthetic-Reset-2026!");
    const rejectedPasswordReset = await resetPassword(resetFormData);
    assert.equal(rejectedPasswordReset.ok, false, "A revoked invitation token must not activate candidate credentials");
    const preservedOriginal = await prisma.cvIntake.findUnique({ where: { id: persisted.id }, select: { originalSha256: true, fileData: true } });
    assert.equal(preservedOriginal?.originalSha256, sha256);
    assert.deepEqual(Buffer.from(preservedOriginal!.fileData), pdfBytes, "Revocation must retain the immutable original CV");

    const reprocessAfterRevocation = await fetch(`${BASE_URL}/api/owner/cv-intake/reprocess`, {
      method: "POST",
      headers: { Cookie: cookieHeader(jar), "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [persisted.id] }),
    });
    const revokedRetryBody = await reprocessAfterRevocation.json() as { results: Array<{ status: string }> };
    assert.equal(revokedRetryBody.results[0]?.status, "SKIPPED_CONSENT_PENDING", "Reanalysis must not run after revocation");
    const inviteAfterRevocation = await fetch(`${BASE_URL}/api/owner/cv-intake/invite`, { method: "POST", headers: { Cookie: cookieHeader(jar), "Content-Type": "application/json" }, body: JSON.stringify({ intakeId: persisted.id }) });
    assert.equal(inviteAfterRevocation.status, 409, "Revocation must block future invitations");
    const stillSuspended = await prisma.candidateProfile.findUnique({ where: { id: invitedUser.candidat.id }, select: { status: true } });
    assert.equal(stillSuspended?.status, "SUSPENDED", "Retry attempts must not reactivate the revoked candidate profile");

    const raceEmail = `cv-consent-race.${suffix}@example.test`;
    emailsToClean.push(raceEmail);
    const raceIntake = await prisma.cvIntake.create({
      data: {
        name: "synthetic-consent-race.pdf",
        originalName: "synthetic-consent-race.pdf",
        mimeType: "application/pdf",
        fileData: pdfBytes,
        size: pdfBytes.length,
        originalSha256: sha256,
        senderUserId: owner.id,
        senderRole: "OWNER",
        senderEmail: owner.email,
        candidateName: "Synthetic Consent Race",
        candidateEmail: raceEmail,
        docType: "CV",
        folderPath: "CANDIDATS/A_CLASSER/CV",
        analysis: { skills: ["TypeScript"], subCategoryCodes: [], primaryCategoryCode: null, sourceFactsOnly: true },
        matching: { consent: { status: "AUTHORIZED", evidence: "E2E synthetic race setup", verifiedAt: new Date().toISOString(), verifiedByUserId: owner.id } },
        analyzedAt: new Date(),
        status: "ANALYSE_OK",
      },
    });
    const [raceSyncResult, raceRevokeResponse] = await Promise.all([
      ingestAnalyzedCvIntakes(owner.id, 1, [raceIntake.id]),
      fetch(`${BASE_URL}/api/owner/cv-intake/${raceIntake.id}/consent`, { method: "POST", headers: { Cookie: cookieHeader(jar), "Content-Type": "application/json" }, body: JSON.stringify({ status: "REVOKED", evidence: "E2E synthetic concurrent revocation evidence" }) }),
    ]);
    assert.equal(raceRevokeResponse.status, 200);
    const raceSourcedCandidate = await prisma.sourcedCandidate.findUnique({
      where: { source_externalId: { source: "PLATFORM_CV_INTAKE", externalId: "cv-intake:" + raceIntake.id } },
      select: { consentStatus: true, status: true, matchingScore: true, matchingDetails: true },
    });
    const raceIntakeAfter = await prisma.cvIntake.findUnique({ where: { id: raceIntake.id }, select: { matching: true } });
    assert.equal((((raceIntakeAfter?.matching as Record<string, unknown> | null)?.consent as Record<string, unknown> | undefined)?.status), "REVOKED");
    assert.ok(!raceSourcedCandidate || (raceSourcedCandidate.consentStatus === "REVOKED" && raceSourcedCandidate.status === "REJECTED"), "A concurrent ingestion must not leave a revoked CV in the active sourcing pool");
    if (raceSourcedCandidate) {
      assert.equal(raceSourcedCandidate.matchingScore, 0);
      assert.deepEqual((raceSourcedCandidate.matchingDetails as Record<string, unknown> | null)?.matchedOffers, []);
    }

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
        noCandidateIdentityCreatedBeforeOwnerAction: true,
        consentRequiredBeforeSourcing: true,
        consentRevocationExcludesFromMatching: true,
        concurrentRevocationAndReanalysisSafe: true,
        staffWithoutCvIntakePermissionDenied: true,
        adminConsentAuthorizationAndAudit: true,
        consultantConsentRevocationAndAudit: true,
        delegatedInvitationDenied: true,
        missingEvidenceRejected: true,
        invitationAfterExplicitOwnerAction: true,
        revokedDerivedDocumentRemoved: true,
        revokedProfileSuspended: true,
        revokedProfileNotReactivated: true,
        revokedInvitationTokenInvalidated: true,
        noAutomaticCandidateInvitation: true,
        noExternalAiProviderCalled: true,
        concurrentIngestionAndRevocationSafe: true,
      },
    }, null, 2));
  } finally {
    if (ownerId) {
      const records = await prisma.cvIntake.findMany({
        where: { senderUserId: ownerId, originalSha256: sha256 },
        select: { id: true, candidateId: true },
      }).catch(() => []);
      const ids = [...new Set(records.map((record) => record.id))];
      await prisma.sourcedCandidate.deleteMany({ where: { source: "PLATFORM_CV_INTAKE", externalId: { in: ids.map((id) => "cv-intake:" + id) } } }).catch(() => undefined);
      if (ids.length) {
        await prisma.auditLog.deleteMany({ where: { targetType: "CV_INTAKE", targetId: { in: ids } } });
        await prisma.cvIntake.deleteMany({ where: { id: { in: ids } } });
      }
      const candidateIds = records.map((record) => record.candidateId).filter((id): id is string => Boolean(id));
      if (candidateIds.length) {
        await prisma.candidateDocument.deleteMany({ where: { candidateId: { in: candidateIds } } });
        await prisma.candidateProfile.deleteMany({ where: { id: { in: candidateIds } } });
      }
      if (candidateUserId) {
        const candidate = await prisma.user.findUnique({ where: { id: candidateUserId }, select: { candidat: { select: { id: true } } } });
        if (candidate?.candidat) {
          await prisma.candidateDocument.deleteMany({ where: { candidateId: candidate.candidat.id } });
          await prisma.candidateProfile.deleteMany({ where: { id: candidate.candidat.id } });
        }
        await prisma.user.deleteMany({ where: { id: candidateUserId } });
      }
      if (emailsToClean.length) await prisma.passwordResetToken.deleteMany({ where: { email: { in: emailsToClean } } });
      for (const staffId of [adminId, consultantId].filter((id): id is string => Boolean(id))) {
        await prisma.systemSetting.deleteMany({ where: { key: `permissions:${staffId}` } });
        await prisma.auditLog.deleteMany({ where: { action: "UPDATE_STAFF_PERMISSIONS", targetType: "USER", targetId: staffId } });
        await prisma.user.deleteMany({ where: { id: staffId } });
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
