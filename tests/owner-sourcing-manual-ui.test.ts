import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("sourcing manual button and candidate detail modal contract", () => {
  const componentPath = "components/owner/CandidateSourcingClient.tsx";
  const content = fs.readFileSync(componentPath, "utf8");

  // 1. Bouton Sourcing Manuel avec protection anti-double clic et feedback
  assert.match(content, /if\s*\(running\)\s*return;/);
  assert.match(content, /data-testid="btn-sourcing-manuel"/);
  assert.match(content, /data-testid="sourcing-run-feedback"/);
  assert.match(content, /Collecte en cours…/);
  assert.match(content, /runStatusType/);

  // 2. Gestion explicite des retours et erreurs
  assert.match(content, /Erreur serveur/);
  assert.match(content, /Erreur réseau pendant le sourcing/);

  // 3. Fiche détaillée du candidat détecté
  assert.match(content, /selectedCandidateForDetail/);
  assert.match(content, /data-testid="modal-detail-candidat"/);
  assert.match(content, /Fiche Profil Découvert · Sourcing RP|Fiche Profil Détecté · Sourcing RP/);
  assert.match(content, /Statut de Traitement/);
  assert.match(content, /Score de Matching/);
  assert.match(content, /Compétences Détectées/);
  assert.match(content, /Provenance de la source/);

  // 4. Confidentialité et validation humaine
  assert.match(content, /Les profils découverts ne sont jamais contactés automatiquement/);
  assert.match(content, /handleCandidateAction\(selectedCandidateForDetail\.id, "VALIDATE"\)/);
  assert.match(content, /handleCandidateAction\(selectedCandidateForDetail\.id, "REJECT"\)/);

  // 5. Synchronisation conditionnée à la réponse du serveur
  assert.match(content, /const confirmedStatus = typeof data\?\.candidate\?\.status === "string" \? data\.candidate\.status : null;/);
  assert.match(content, /Le serveur n'a pas confirmé le statut du candidat\./);
  assert.match(content, /setSelectedCandidateForDetail\(\(prev\) =>/);
  assert.match(content, /if \(actionLoadingId\) return false;/);

  // 6. Accessibilité Clavier et ARIA
  assert.match(content, /if\s*\(e\.key === "Escape"\)/);
  assert.match(content, /aria-labelledby="modal-candidate-detail-title"/);
  assert.match(content, /aria-describedby="modal-candidate-detail-desc"/);

  // 7. Traçabilité et historique d'audit
  assert.match(content, /data-testid="section-historique-actions"/);
  assert.match(content, /\/api\/sourcing\/candidate-history\?candidateId=/);
});

test("candidate history route contract and authorization", async () => {
  const { GET } = await import("../app/api/sourcing/candidate-history/route");

  // Non-authentifié / non autorisé -> 403
  const reqUnauthorized = new Request("http://localhost:3000/api/sourcing/candidate-history?candidateId=cand_1");
  const resUnauthorized = await GET(reqUnauthorized);
  assert.equal(resUnauthorized.status, 403);

  // Paramètre manquant -> 400
  const { runWithTestSession } = await import("../auth");
  const ownerSession = {
    user: { id: "owner_usr_001", role: "OWNER", name: "Owner Test", email: "owner@recrutement-prive.com" },
  };

  const reqMissing = new Request("http://localhost:3000/api/sourcing/candidate-history");
  const resMissing = await runWithTestSession(ownerSession, () => GET(reqMissing));
  assert.equal(resMissing.status, 400);
});

test("atomic candidate action route wraps update and audit log in a transaction", () => {
  const routeContent = fs.readFileSync("app/api/sourcing/candidate-actions/route.ts", "utf8");
  assert.match(routeContent, /prisma\.\$transaction\(async \(tx\) =>/);
  assert.match(routeContent, /tx\.sourcedCandidate\.update/);
  assert.match(routeContent, /tx\.auditLog\.create/);
});

test("candidate actions server behavior: authentication, permission check and payload validation", async () => {
  const { POST } = await import("../app/api/sourcing/candidate-actions/route");

  // 1. Unauthenticated or unauthorized call
  const reqUnauthorized = new Request("http://localhost:3000/api/sourcing/candidate-actions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ candidateId: "cand_1", action: "VALIDATE" }),
  });
  const resUnauthorized = await POST(reqUnauthorized);
  assert.equal(resUnauthorized.status, 403);
  const dataUnauthorized = await resUnauthorized.json();
  assert.equal(dataUnauthorized.error, "Permission de sourcing non accordée.");

  // 2. Missing payload parameters
  const { runWithTestSession } = await import("../auth");
  const ownerSession = {
    user: { id: "owner_usr_001", role: "OWNER", name: "Owner Test", email: "owner@recrutement-prive.com" },
  };

  const reqMissing = new Request("http://localhost:3000/api/sourcing/candidate-actions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ candidateId: "cand_1" }), // missing action
  });
  const resMissing = await runWithTestSession(ownerSession, () => POST(reqMissing));
  assert.equal(resMissing.status, 400);
  const dataMissing = await resMissing.json();
  assert.equal(dataMissing.error, "candidateId et action sont requis.");
});
