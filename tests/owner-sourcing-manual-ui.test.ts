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
});
