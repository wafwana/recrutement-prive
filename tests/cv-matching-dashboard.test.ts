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
  assert.match(page, /Préparer la mise en relation/);
});

test("matching suggestions use anonymous labels rather than exposing names or email addresses", () => {
  assert.match(route, /candidateAlias\(candidate\.id\)/);
  assert.match(route, /companyAlias\(job\.companyId\)/);
  assert.doesNotMatch(page, /candidate\.email/);
  assert.doesNotMatch(page, /match\.email/);
  assert.doesNotMatch(page, /match\.name/);
});

test("confidential presentation is explicitly requested, permission-gated, re-scored and audited", () => {
  assert.match(route, /presentationSchema/);
  assert.match(route, /action: z\.literal\("present"\)/);
  assert.match(route, /"PRESENTATIONS_MANAGE"/);
  assert.match(route, /match\.score < 25/);
  assert.match(route, /tx\.missionPresentation\.create/);
  assert.match(route, /anonymousMessagingEnabled: true/);
  assert.match(route, /identityProtected: true/);
  assert.match(route, /"CANDIDATE_MATCH_PRESENTED"/);
});

test("matching does not send outreach or open a meeting automatically", () => {
  assert.doesNotMatch(route, /outreachContact\.create/);
  assert.doesNotMatch(route, /contactMeeting\.create/);
  assert.match(route, /aucun email ni contact externe/i);
});

test("automatic proposals are bounded and show if a pair has already been presented", () => {
  assert.match(route, /take: 150/);
  assert.match(route, /ranked\.slice\(0, 100\)/);
  assert.match(route, /presentationExists/);
  assert.match(page, /match\.presentationExists/);
});
