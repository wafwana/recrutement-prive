import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("public company registry lookup has a per-client first-line rate limit", () => {
  const route = fs.readFileSync("app/api/company/siret/route.ts", "utf8");

  assert.match(route, /import \{ rateLimit \} from "@\/lib\/security\/rate-limit"/);
  assert.match(route, /rateLimit\(\`company-siret:\$\{clientIp\}\`, LOOKUP_LIMIT, LOOKUP_WINDOW_MS\)/);
  assert.match(route, /x-real-ip/);
  assert.match(route, /status: 429/);
  assert.match(route, /"Retry-After"/);
  assert.ok(route.indexOf("if (!limit.allowed)") < route.indexOf("lookupCompanyBySiren"));
  assert.ok(route.indexOf("if (!limit.allowed)") < route.indexOf("lookupCompanyBySiret"));
});
