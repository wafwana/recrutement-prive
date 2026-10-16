import test from "node:test";
import assert from "node:assert/strict";
import { RP_TAXONOMY } from "../lib/taxonomy/rp-taxonomy";
import { getSectorVisual, isSectorVisualMapped, SECTOR_VISUAL_FAMILIES } from "../lib/taxonomy/sector-visuals";

test("every top-level taxonomy sector has an explicitly mapped visual family", () => {
  for (const sector of RP_TAXONOMY) {
    assert.equal(isSectorVisualMapped(sector.code), true, `Missing sector image: ${sector.code}`);
    assert.ok(SECTOR_VISUAL_FAMILIES[sector.code], `Missing visual family: ${sector.code}`);
  }
});

test("each sector visual uses a specific Unsplash photo page and a compressed crop URL", () => {
  for (const sector of RP_TAXONOMY) {
    const visual = getSectorVisual(sector.code, sector.name.fr);
    assert.match(visual.src, /^https:\/\/images\.unsplash\.com\/photo-/);
    assert.match(visual.src, /auto=format/);
    assert.match(visual.src, /fit=crop/);
    assert.match(visual.src, /q=78/);
    assert.match(visual.src, /w=960/);
    assert.match(visual.sourcePage, /^https:\/\/unsplash\.com\/photos\//);
    assert.ok(visual.alt.includes(sector.name.fr), `Missing contextual alt text for ${sector.code}`);
  }
});

test("public landing-page agriculture alias and casino taxonomy have relevant mapped families", () => {
  assert.equal(SECTOR_VISUAL_FAMILIES.AGRICULTURE, "agriculture");
  assert.equal(SECTOR_VISUAL_FAMILIES.CASINOS_JEUX, "casino");
  assert.equal(SECTOR_VISUAL_FAMILIES.IT, "technology");
  assert.equal(SECTOR_VISUAL_FAMILIES.FINANCE, "finance");
});

test("subcategories reuse the parent's family image rather than inventing a separate photo gallery", () => {
  for (const sector of RP_TAXONOMY) {
    const parentVisual = getSectorVisual(sector.code, sector.name.fr);
    for (const subcategory of sector.subcategories) {
      assert.equal(parentVisual.sourcePage, getSectorVisual(sector.code, subcategory.name.fr).sourcePage);
    }
  }
});
