import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("persistent OWNER navigation is visible only to OWNER and keeps role authorization unchanged", () => {
  const layout = read("app/espace/layout.tsx");
  assert.match(layout, /import OwnerWorkspaceNavigation from "@\/components\/owner\/OwnerWorkspaceNavigation"/);
  assert.match(layout, /role === "OWNER" \? <OwnerWorkspaceNavigation \/> : null/);
  assert.doesNotMatch(layout, /const navigation = \[/);
  assert.doesNotMatch(layout, /visibleNavigation/);
  assert.match(layout, /workspaceRole \? <RoleWorkspaceNavigation role=\{workspaceRole\}/);
  assert.match(layout, /<ContextBackButton \/>/);
  const legacyLayout = read("app/owner/layout.tsx");
  assert.match(legacyLayout, /session\?\.user\?\.role === "OWNER" \? <OwnerWorkspaceNavigation \/> : null/);
});

test("OWNER navigation offers core work areas, grouped routes and keyboard/screen-reader states", () => {
  const nav = read("components/owner/OwnerWorkspaceNavigation.tsx");
  for (const labelKey of ["ws_owner_overview","ws_owner_candidates","ws_owner_cv_library","ws_owner_jobs_taxonomy","ws_owner_sourcing","ws_owner_matching","ws_owner_executive_search","ws_owner_functions","ws_owner_group_research_sourcing","ws_owner_group_companies_offers","ws_owner_group_cv_documents","ws_owner_group_partners_finance","ws_owner_group_team_governance","ws_owner_return","ws_owner_open_collapse","ws_owner_research_candidates","ws_owner_add_company","ws_owner_offer_pool","ws_owner_cv_intake","ws_owner_anonymized_cvs","ws_owner_archiving","ws_owner_partners_sources","ws_owner_expenses","ws_owner_pre_accounting","ws_owner_services_pricing","ws_owner_billing","ws_owner_admin_management","ws_owner_consultants","ws_owner_permissions","ws_messages"]) {
    assert.ok(nav.includes(labelKey), `missing OWNER translation key: ${labelKey}`);
  }
  assert.match(nav, /useI18n/);
  assert.match(nav, /t\(item\.labelKey\)/);
  assert.match(nav, /t\(group\.titleKey\)/);
  assert.match(nav, /usePathname/);
  assert.match(nav, /aria-current=\{active \? "page" : undefined\}/);
  assert.match(nav, /focus-visible:ring-2/);
  assert.match(nav, /t\("ws_owner_navigation_aria"\)/);
});

test("every hard-coded OWNER navigation destination resolves to an existing App Router page", () => {
  const nav = read("components/owner/OwnerWorkspaceNavigation.tsx");
  const hrefs = [...nav.matchAll(/href: "([^"]+)"/g)].map((match) => match[1]);
  assert.ok(hrefs.length >= 25, `expected complete navigation list; got ${hrefs.length} links`);
  for (const href of hrefs) {
    const routePath = href.split("#")[0].slice(1);
    const routeFile = path.join(root, "app", routePath, "page.tsx");
    assert.ok(fs.existsSync(routeFile), `navigation target has no page: ${href} -> ${routeFile}`);
  }
});
