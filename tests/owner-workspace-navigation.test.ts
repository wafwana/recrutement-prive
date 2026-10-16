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
  for (const label of [
    "Vue d’ensemble", "Candidats", "CVthèque", "Métiers & dossiers",
    "Sourcing", "Matching", "Executive Search", "Toutes les fonctions",
    "Recherche & sourcing", "Entreprises & offres", "CV, dossiers & documents",
    "Partenaires & finances", "Équipe & gouvernance",
  ]) assert.ok(nav.includes(label), `missing navigation item: ${label}`);
  assert.match(nav, /usePathname/);
  assert.match(nav, /aria-current=\{active \? "page" : undefined\}/);
  assert.match(nav, /focus-visible:ring-2/);
  assert.match(nav, /aria-label="Navigation de l’espace OWNER"/);
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
