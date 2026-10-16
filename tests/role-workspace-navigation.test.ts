import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("role workspaces get persistent navigation without changing the OWNER gate", () => {
  const layout = read("app/espace/layout.tsx");
  assert.match(layout, /import RoleWorkspaceNavigation.*from "@\/components\/workspace\/RoleWorkspaceNavigation"/);
  assert.match(layout, /workspaceRole \? <RoleWorkspaceNavigation role=\{workspaceRole\}/);
  assert.match(layout, /role === "OWNER" \? <OwnerWorkspaceNavigation \/> : null/);
  assert.doesNotMatch(layout, /const navigation = \[/);
  assert.doesNotMatch(layout, /visibleNavigation/);
  assert.match(layout, /aria-label="Navigation générale"/);
  assert.ok(layout.includes('import ReturnToSiteLink from "@/components/navigation/ReturnToSiteLink"'));
  assert.match(layout, /<ReturnToSiteLink \/>/);
  assert.doesNotMatch(layout, /href="\/espace\/admin\/configuration"/);
  assert.match(layout, /allowedAdminPermissions/);
});

test("navigation separates candidate, enterprise, consultant and ADMIN destinations", () => {
  const nav = read("components/workspace/RoleWorkspaceNavigation.tsx");
  for (const role of ["CANDIDAT", "ENTREPRISE", "CONSULTANT", "ADMIN"]) {
    assert.match(nav, new RegExp(`^  ${role}: \\{`, "m"), `missing role navigation: ${role}`);
  }
  for (const labelKey of ["ws_candidate_title","ws_candidate_description","ws_candidate_profile_documents","ws_candidate_applications","ws_enterprise_title","ws_enterprise_description","ws_enterprise_offers","ws_enterprise_applications","ws_enterprise_presentations","ws_consultant_title","ws_consultant_description","ws_consultant_pipeline","ws_consultant_sourcing","ws_admin_title","ws_admin_description","ws_admin_dashboard","ws_admin_permissions","ws_admin_configuration","ws_admin_partners_sources","ws_messages","ws_overview"]) {
    assert.ok(nav.includes(labelKey), `missing navigation translation key: ${labelKey}`);
  }
  assert.match(nav, /useI18n/);
  assert.match(nav, /t\(item\.labelKey\)/);
  assert.match(nav, /aria-current=\{active \? "page" : undefined\}/);
  assert.match(nav, /focus-visible:ring-2/);
  assert.doesNotMatch(nav, /href: "\/espace\/owner/);
});

test("every hard-coded workspace destination resolves to a page and every in-page shortcut has a real target", () => {
  const nav = read("components/workspace/RoleWorkspaceNavigation.tsx");
  const hrefs = [...nav.matchAll(/href: "([^"]+)"/g)].map((match) => match[1]);
  assert.ok(hrefs.length >= 15, `expected all role navigation destinations; got ${hrefs.length}`);
  for (const href of hrefs) {
    const [route, anchor] = href.split("#");
    const routePath = path.join(root, "app", route.slice(1), "page.tsx");
    assert.ok(fs.existsSync(routePath), `navigation destination has no page: ${href}`);
    if (anchor) {
      const page = route === "/espace/entreprise"
        ? read("app/espace/entreprise/CompanyDashboard.tsx")
        : read(path.relative(root, routePath));
      assert.match(page, new RegExp(`id=["']${anchor}["']`), `shortcut target does not exist: ${href}`);
    }
  }
});

test("ADMIN-only tools are permission-gated and do not expose OWNER navigation", () => {
  const nav = read("components/workspace/RoleWorkspaceNavigation.tsx");
  assert.match(nav, /permission: "PLATFORM_SETTINGS"/);
  assert.match(nav, /permission: "PARTNERS_MANAGE"/);
  assert.match(nav, /!item\.permission \|\| allowedAdminPermissions\.includes\(item\.permission\)/);
});

test("enterprise navigation preserves the selected company when jumping between dashboard sections", () => {
  const nav = read("components/workspace/RoleWorkspaceNavigation.tsx");
  assert.ok(nav.includes("useSearchParams"));
  assert.ok(nav.includes('searchParams.get("companyId")'));
  assert.ok(nav.includes("encodeURIComponent(activeCompanyId)"));
  assert.ok(nav.includes("href={getHref(item.href)}"));
});
