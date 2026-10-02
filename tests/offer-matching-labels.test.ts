import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getOfferMatchingStatus } from "../lib/offers/matching-status";

describe("Offer Matching Status Helper - Functional Rules", () => {
  test("Rule 1: Engine actively searching for candidates displays 'Recherche de candidats'", () => {
    // QUALIFYING status
    const status1 = getOfferMatchingStatus({
      status: "QUALIFYING",
      rawData: { qualification: { attemptCount: 1 } },
    });
    assert.equal(status1.code, "SEARCHING");
    assert.equal(status1.label, "Recherche de candidats");

    // Active search flag in rawData
    const status2 = getOfferMatchingStatus({
      status: "A_QUALIFIER",
      rawData: { matching: { isSearching: true } },
    });
    assert.equal(status2.code, "SEARCHING");
    assert.equal(status2.label, "Recherche de candidats");
  });

  test("Rule 2: Engine finished with candidate match(es) human-validated displays 'Matching détecté'", () => {
    const status = getOfferMatchingStatus({
      status: "MATCHING",
      rawData: {
        matching: {
          matchedAt: "2026-10-01T20:00:00.000Z",
          matchCount: 3,
          topMatches: [{ candidateId: "c1", score: 85 }],
          humanValidated: true,
        },
      },
    });
    assert.equal(status.code, "MATCH_DETECTED");
    assert.equal(status.label, "Matching détecté");
  });

  test("Rule 3: Match found awaiting human validation displays 'À valider'", () => {
    const status = getOfferMatchingStatus({
      status: "MATCHING",
      rawData: {
        matching: {
          matchedAt: "2026-10-01T20:00:00.000Z",
          matchCount: 2,
          topMatches: [{ candidateId: "c2", score: 78 }],
          humanValidated: false,
        },
      },
    });
    assert.equal(status.code, "PENDING_HUMAN_VALIDATION");
    assert.equal(status.label, "À valider");
  });

  test("Rule 4: Treatment completed without correspondence displays 'Aucun matching trouvé'", () => {
    const status = getOfferMatchingStatus({
      status: "MATCHING",
      rawData: {
        matching: {
          matchedAt: "2026-10-01T20:00:00.000Z",
          matchCount: 0,
          topMatches: [],
          humanValidated: false,
        },
      },
    });
    assert.equal(status.code, "NO_MATCH");
    assert.equal(status.label, "Aucun matching trouvé");
  });

  test("MATCHING without result metadata is not mislabeled as zero matches", () => {
    const status = getOfferMatchingStatus({ status: "MATCHING" });
    assert.equal(status.code, "MATCHING_IN_PROGRESS");
    assert.equal(status.label, "Matching en cours");
  });

  test("Completed matching without count or topMatches reports unavailable results", () => {
    const status = getOfferMatchingStatus({
      status: "MATCHING",
      rawData: { matching: { matchedAt: "2026-10-01T20:00:00.000Z" } },
    });
    assert.equal(status.code, "MATCHING_UNAVAILABLE");
    assert.equal(status.label, "Résultats de matching indisponibles");
  });

  test("Missing matchCount uses a present topMatches array as the result set", () => {
    const status = getOfferMatchingStatus({
      status: "MATCHING",
      rawData: { matching: { matchedAt: "2026-10-01T20:00:00.000Z", topMatches: [] } },
    });
    assert.equal(status.code, "NO_MATCH");
    assert.equal(status.label, "Aucun matching trouvé");
  });

  test("Standard lifecycle fallback labels remain accurate", () => {
    assert.equal(getOfferMatchingStatus({ status: "DETECTED" }).label, "Nouvelle");
    assert.equal(getOfferMatchingStatus({ status: "A_QUALIFIER" }).label, "À qualifier");
    assert.equal(getOfferMatchingStatus({ status: "QUALIFIED" }).label, "Qualifiée");
    assert.equal(getOfferMatchingStatus({ status: "CONTACTED" }).label, "Contactée");
    assert.equal(getOfferMatchingStatus({ status: "FILLED" }).label, "Pourvue");
    assert.equal(getOfferMatchingStatus({ status: "ARCHIVED" }).label, "Archivée");
    assert.equal(getOfferMatchingStatus({ status: "REJECTED" }).label, "Écartée");
  });
});
