import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

test("secure contact requests require cabinet authorization before activation", () => {
  const route = fs.readFileSync(path.join(root, "app/api/contacts/secure/route.ts"), "utf8");
  assert.match(route, /action: z\.literal\("authorize"\)/);
  assert.match(route, /meeting\.status !== "REQUESTED"/);
  assert.match(route, /status = parsed\.data\.approve \? "CONFIRMED" : "REJECTED"/);
  assert.match(route, /SECURE_CONTACT_AUTHORIZED/);
});

test("authorization is OWNER-first with delegated admin capability", () => {
  const route = fs.readFileSync(path.join(root, "app/api/contacts/secure/route.ts"), "utf8");
  assert.match(route, /session\.user\.role !== "OWNER"/);
  assert.match(route, /"SECURE_CONTACTS_AUTHORIZE"/);
  assert.match(route, /delegatedAdmin: session\.user\.role === "ADMIN"/);
});

test("owner cockpit exposes operational Executive Search tabs and the authorization queue", () => {
  const page = fs.readFileSync(path.join(root, "app/espace/owner/contacts-securises/page.tsx"), "utf8");
  const tabs = fs.readFileSync(path.join(root, "app/espace/owner/contacts-securises/ExecutiveSearchTabs.tsx"), "utf8");
  assert.match(page, /ExecutiveSearchTabs/);
  assert.match(page, /status: "REQUESTED"/);
  assert.match(tabs, /id: "presentations"/);
  assert.match(tabs, /id: "meetings"/);
  assert.match(tabs, /id: "authorizations"/);
  assert.match(tabs, /id: "decisions"/);
  assert.match(tabs, /id: "outreach"/);
  assert.match(tabs, /AuthorizationQueue/);
});
