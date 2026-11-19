import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

test("trusted video fails closed without TURN configuration", () => {
  const route = fs.readFileSync(path.join(root, "app/api/video/sessions/route.ts"), "utf8");
  assert.match(route, /RP_TURN_URLS/);
  assert.match(route, /RP_TURN_USERNAME/);
  assert.match(route, /RP_TURN_CREDENTIAL/);
  assert.match(route, /Service vidéo sécurisé non configuré/);
});

test("trusted video enforces relay-only transport in the browser", () => {
  const client = fs.readFileSync(path.join(root, "components/messaging/TrustedVideoRoom.tsx"), "utf8");
  assert.match(client, /iceTransportPolicy:\s*"relay"/);
});

test("trusted video closes on identity unlock or mission completion", () => {
  const route = fs.readFileSync(path.join(root, "app/api/video/sessions/route.ts"), "utf8");
  assert.match(route, /IDENTITE_DEBLOQUEE/);
  assert.match(route, /MISSION_TERMINEE/);
  assert.match(route, /anonymousMessagingEnabled/);
});

test("trusted video is audited", () => {
  const route = fs.readFileSync(path.join(root, "app/api/video/sessions/route.ts"), "utf8");
  assert.match(route, /TRUST_VIDEO_CREATED/);
  assert.match(route, /TRUST_VIDEO_STARTED/);
  assert.match(route, /TRUST_VIDEO_ENDED/);
});

test("trusted video requires an authorized paid VIDEO contact and both contract acceptances", () => {
  const route = fs.readFileSync(path.join(root, "app/api/video/sessions/route.ts"), "utf8");
  assert.match(route, /channel: "VIDEO"/);
  assert.match(route, /status: \{ in: \["CONFIRMED", "ACTIVE"\] \}/);
  assert.match(route, /paymentStatus: "PAID"/);
  assert.match(route, /eligibleVideoMeeting/);
  assert.match(route, /acceptances\[presentation\.candidateUserId\]/);
  assert.match(route, /acceptances\[presentation\.companyUserId\]/);
});

test("trusted video revalidates contact eligibility for existing sessions", () => {
  const route = fs.readFileSync(path.join(root, "app/api/video/sessions/route.ts"), "utf8");
  const sessionGate = route.slice(route.indexOf("async function getSession"), route.indexOf("function publicSession"));
  assert.match(sessionGate, /eligibleVideoMeeting\(p\.id\)/);
});
