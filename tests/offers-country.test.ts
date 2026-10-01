import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCountry, extractOfferCountries, matchOfferCountry } from "../lib/offers/country";

test("normalizeCountry: normalizes synonyms and country codes correctly", () => {
  assert.equal(normalizeCountry("FR"), "France");
  assert.equal(normalizeCountry("fr"), "France");
  assert.equal(normalizeCountry(" France "), "France");
  assert.equal(normalizeCountry("UK"), "Royaume-Uni");
  assert.equal(normalizeCountry("GB"), "Royaume-Uni");
  assert.equal(normalizeCountry("US"), "États-Unis");
  assert.equal(normalizeCountry("USA"), "États-Unis");
  assert.equal(normalizeCountry("DE"), "Allemagne");
  assert.equal(normalizeCountry("ES"), "Espagne");
  assert.equal(normalizeCountry("IT"), "Italie");
  assert.equal(normalizeCountry("CH"), "Suisse");
  assert.equal(normalizeCountry("BE"), "Belgique");
});

test("normalizeCountry: preserves clean unknown country names without inventing values", () => {
  assert.equal(normalizeCountry(" Singapore "), "Singapore");
  assert.equal(normalizeCountry("Japon"), "Japon");
});

test("normalizeCountry: handles empty, null and undefined inputs safely", () => {
  assert.equal(normalizeCountry(""), null);
  assert.equal(normalizeCountry("   "), null);
  assert.equal(normalizeCountry(null), null);
  assert.equal(normalizeCountry(undefined), null);
});

test("extractOfferCountries: extracts unique, normalized, sorted country list from offers", () => {
  const sampleOffers = [
    { country: "France" },
    { country: "FR" },
    { country: "fr" },
    { country: "UK" },
    { country: "Royaume-Uni" },
    { country: "Allemagne" },
    { country: "DE" },
    { country: "  " },
    { country: null },
    { country: undefined },
    { country: "Japon" },
  ];

  const countries = extractOfferCountries(sampleOffers);
  assert.deepEqual(countries, ["Allemagne", "France", "Japon", "Royaume-Uni"]);
});

test("matchOfferCountry: checks country matching accurately", () => {
  // Matching France variations
  assert.equal(matchOfferCountry("FR", "France"), true);
  assert.equal(matchOfferCountry("France", "FR"), true);
  assert.equal(matchOfferCountry("fr", "france"), true);

  // Distinguishes different countries correctly
  assert.equal(matchOfferCountry("FR", "Royaume-Uni"), false);
  assert.equal(matchOfferCountry("France", "Afrique du Sud"), false);

  // Empty or null filter allows all offers
  assert.equal(matchOfferCountry("France", ""), true);
  assert.equal(matchOfferCountry("France", "   "), true);
  assert.equal(matchOfferCountry(null, ""), true);

  // Offers without country do not match explicit country filter
  assert.equal(matchOfferCountry(null, "France"), false);
  assert.equal(matchOfferCountry(undefined, "France"), false);
  assert.equal(matchOfferCountry("", "France"), false);
});
