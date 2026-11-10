import assert from "node:assert/strict";
import fs from "node:fs";
import testCase from "node:test";

testCase("Pôle 2 company workspace is linked from the authenticated enterprise dashboard", () => {
  const dashboard = fs.readFileSync("app/espace/entreprise/CompanyDashboard.tsx", "utf8");
  const page = fs.readFileSync("app/espace/entreprise/solutions-tech/page.tsx", "utf8");
  assert.ok(dashboard.includes("/espace/entreprise/solutions-tech?companyId="));
  assert.ok(page.includes('session.user.role !== "ENTREPRISE"'));
  assert.ok(page.includes("requireCompanyAccess(companyId)"));
});

testCase("Pôle 2 client requests are tied to the actual company membership", () => {
  const route = fs.readFileSync("app/api/tech/client-requests/route.ts", "utf8");
  assert.ok(route.includes("requireCompanyAccess(body.companyId)"));
  assert.ok(route.includes('leadSource: "POLE_1_COMPANY_CLIENT"'));
  assert.ok(route.includes("sourceCompanyId: company.id"));
  assert.ok(route.includes("CLIENT_REQUEST_SUBMITTED"));
  assert.ok(route.includes('actorRole: "ENTREPRISE"'));
  assert.ok(!route.includes("outreach"));
});

testCase("Pôle 2 client workspace only returns its own requests and linked projects", () => {
  const page = fs.readFileSync("app/espace/entreprise/solutions-tech/page.tsx", "utf8");
  assert.ok(page.includes('where: { leadSource: "POLE_1_COMPANY_CLIENT" }'));
  assert.ok(page.includes("signals.sourceCompanyId === access.companyId"));
  assert.ok(page.includes("techProspectId: { in: prospectIds }"));
  assert.ok(!page.includes("findMany({\n    orderBy: { createdAt: \"desc\""));
});
