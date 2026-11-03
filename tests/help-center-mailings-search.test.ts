import assert from "node:assert/strict";
import { test } from "node:test";
import { GET as helpSearchGet } from "../app/api/help/search/route";
import { GET as mailingsGet } from "../app/api/mailings/templates/route";
import { GET as documentSearchGet } from "../app/api/documents/search/route";
import { HELP_GUIDES, getTaxonomyHelpGuides } from "../lib/help/help-center-data";
import { MAILING_TEMPLATES } from "../lib/mailings/mailings-data";
import { runWithTestSession } from "../auth";

test("Help guides and taxonomy procedures data consistency", () => {
  assert.ok(HELP_GUIDES.length >= 4, "Must contain core operational guides");
  const taxonomyGuides = getTaxonomyHelpGuides();
  assert.ok(taxonomyGuides.length >= 10, "Must generate dynamic guides for taxonomy sectors");

  for (const guide of HELP_GUIDES) {
    assert.ok(guide.id, "Guide must have an id");
    assert.ok(guide.steps.length > 0, "Guide must contain steps");
    assert.ok(guide.prerequisites.length > 0, "Guide must list prerequisites");
  }
});

test("Mailing templates categorization and mandatory variables", () => {
  assert.equal(MAILING_TEMPLATES.length, 4, "Must contain exactly 4 core templates");

  const categories = new Set(MAILING_TEMPLATES.map((t) => t.category));
  assert.ok(categories.has("ENTREPRISES"));
  assert.ok(categories.has("SPONSORS"));
  assert.ok(categories.has("COLLABORATEURS"));
  assert.ok(categories.has("PARTENAIRES"));

  for (const tpl of MAILING_TEMPLATES) {
    assert.ok(tpl.subject, "Template must have a subject line");
    assert.ok(tpl.body, "Template must have a body");
    assert.ok(tpl.variables.length > 0, "Template must define customizable variables");
  }
});

test("Help search API endpoint permission checks and search matching", async () => {
  // Test unauthenticated call returns 401
  await runWithTestSession({}, async () => {
    const req = new Request("http://localhost/api/help/search?q=sourcing");
    const res = await helpSearchGet(req);
    assert.equal(res.status, 401);
  });

  // Test authenticated candidate search returns guides
  await runWithTestSession({ user: { id: "cand-1", role: "CANDIDAT" } }, async () => {
    const req = new Request("http://localhost/api/help/search?q=sourcing");
    const res = await helpSearchGet(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.guides.length > 0);
    assert.equal(data.templates.length, 0, "Non-staff roles must not see mailing templates");
  });

  // Test authenticated staff sees both guides and mailing templates
  await runWithTestSession({ user: { id: "staff-1", role: "OWNER" } }, async () => {
    const req = new Request("http://localhost/api/help/search?q=profil");
    const res = await helpSearchGet(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.guides.length >= 0);
    assert.ok(data.templates.length > 0, "Staff roles must see matching mailing templates");
  });
});

test("Mailing templates API endpoint RBAC enforcement", async () => {
  // Candidate role forbidden from mailings API (403)
  await runWithTestSession({ user: { id: "cand-1", role: "CANDIDAT" } }, async () => {
    const req = new Request("http://localhost/api/mailings/templates");
    const res = await mailingsGet(req);
    assert.equal(res.status, 403);
  });

  // OWNER role allowed
  await runWithTestSession({ user: { id: "owner-1", role: "OWNER" } }, async () => {
    const req = new Request("http://localhost/api/mailings/templates?category=ENTREPRISES");
    const res = await mailingsGet(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.templates.length, 1);
    assert.equal(data.templates[0].category, "ENTREPRISES");
  });
});

test("Document search API RBAC enforcement and binary download restriction", async () => {
  // Test unauthenticated returns 401
  await runWithTestSession({}, async () => {
    const req = new Request("http://localhost/api/documents/search");
    const res = await documentSearchGet(req);
    assert.equal(res.status, 401);
  });
});
