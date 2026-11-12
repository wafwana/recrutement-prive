import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const page = fs.readFileSync(path.join(root, "app/espace/owner/cv-matching/page.tsx"), "utf8");
const route = fs.readFileSync(path.join(root, "app/api/owner/cv-matching/route.ts"), "utf8");

test("matching dashboard loads ranked proposals automatically in both directions", () => {
  assert.match(page, /api\/owner\/cv-matching\?mode=overview/);
  assert.match(page, /Candidat → opportunités/);
  assert.match(page, /Offre → candidats/);
  assert.match(page, /byCandidate/);
  assert.match(page, /byOffer/);
  assert.match(page, /Mise en relation|Proposer anonymisé|Proposer complètement/);
});

test("matching recalculation evaluates candidate-job pairs and audits the actual result", () => {
  const start = route.indexOf('if (parsed.data.action === "recalculate")');
  const end = route.indexOf('return NextResponse.json({ error: "Action non prise en charge."', start);
  assert.ok(start >= 0 && end > start, "recalculation action block must exist");
  const block = route.slice(start, end);
  assert.match(block, /matchCandidateToJob\(/);
  assert.match(block, /for \(const candidate of candidates\)/);
  assert.match(block, /for \(const job of jobs\)/);
  assert.match(block, /evaluatedPairs/);
  assert.match(block, /action: "CV_MATCHING_RECALCULATED"/);
  assert.match(block, /auditLog\.create/);
  assert.match(block, /success: false/);
  assert.match(block, /truncated/);
});
test("matching suggestions use anonymous labels rather than exposing names or email addresses", () => {
  assert.match(route, /candidateAlias\(candidate\.id\)/);
  assert.match(route, /companyAlias\(job\.companyId\)/);
  assert.doesNotMatch(page, /candidate\.email/);
  assert.doesNotMatch(page, /match\.email/);
});

test("confidential presentation is explicitly requested, permission-gated, re-scored and audited", () => {
  assert.match(route, /connectMatchmakingSchema|presentationSchema/);
  assert.match(route, /action: z\.literal\("(connect_matchmaking|present)"\)/);
  assert.match(route, /const canPresent = access\.role === "OWNER"/);
  assert.match(route, /if \(access\.role !== "OWNER"\)/);
  assert.doesNotMatch(route, /PRESENTATIONS_MANAGE/);
  assert.match(route, /match\.score < 25/);
  assert.match(route, /tx\.missionPresentation\.create/);
  assert.match(route, /anonymousMessagingEnabled: true/);
  assert.match(route, /identityProtected: true/);
  assert.match(route, /"CANDIDATE_MATCH_PRESENTED"/);
});

test("matching does not send outreach or open a meeting automatically", () => {
  assert.doesNotMatch(route, /outreachContact\.create/);
  assert.doesNotMatch(route, /contactMeeting\.create/);
  assert.match(route, /aucun e-mail ni contact externe/i);
});

test("automatic proposals are bounded and show if a pair has already been presented", () => {
  // The overview is deliberately bounded until cursor-based global evaluation exists.
  assert.equal((route.match(/take: 150/g) || []).length, 2);
  assert.match(route, /candidateProfile\.count\(\{ where: \{ status: "ACTIVE" \} \}\)/);
  assert.match(route, /job\.count\(\{ where: \{ status: "OPEN" \} \}\)/);
  assert.match(route, /totalActiveCandidates > candidates\.length/);
  assert.match(route, /totalOpenJobs > jobs\.length/);
  assert.match(route, /ranked\.slice\(0, 100\)/);
  assert.match(route, /candidateSuggestions/);
  assert.match(route, /offerSuggestions/);
  assert.match(route, /candidateCount < 3/);
  assert.match(route, /offerCount < 3/);
  assert.match(route, /presentationExists/);
  assert.match(page, /match\.presentationExists/);
});


test("full candidate proposals require the linked, active CV Intake consent proof", () => {
  assert.match(route, /candidatePreferences\.sourceCvIntakeId/);
  assert.match(route, /where: \{ id: consentIntakeId, candidateId: candidate\.id \}/);
  assert.match(route, /candidatePreferences\.consentStatus === "AUTHORIZED"/);
  assert.match(route, /consent\.status === "AUTHORIZED"/);
  assert.match(route, /consent\.evidence/);
  assert.match(route, /consentVerifiedByUserId/);
  assert.match(route, /consentVerifiedAt/);
  assert.doesNotMatch(route, /const hasExplicitPositiveConsent = false/);
});
