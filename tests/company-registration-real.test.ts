import assert from "node:assert/strict";
import test from "node:test";
import { registerCompany } from "../app/inscription/entreprise/actions";
import { prisma } from "../lib/prisma";

test("company registration: validation of invalid identifiers (wrong length, letters)", async () => {
  const formInvalidSiret = new FormData();
  formInvalidSiret.set("companyName", "Test Invalide");
  formInvalidSiret.set("userName", "Jean Test");
  formInvalidSiret.set("email", "invalide@test.com");
  formInvalidSiret.set("password", "Recrutement@2026!");
  formInvalidSiret.set("country", "France");
  formInvalidSiret.set("siret", "12345"); // invalid length

  const resInvalid = await registerCompany(formInvalidSiret);
  assert.equal(resInvalid.ok, false);
  assert.match(resInvalid.error || "", /SIREN à 9 chiffres ou un SIRET à 14 chiffres/);
});

test("company registration: rejection of weak passwords", async () => {
  const formWeak = new FormData();
  formWeak.set("companyName", "Test Pass");
  formWeak.set("userName", "Jean Test");
  formWeak.set("email", "pass@test.com");
  formWeak.set("password", "weak");
  formWeak.set("country", "France");
  formWeak.set("siret", "12345678901234");

  const resWeak = await registerCompany(formWeak);
  assert.equal(resWeak.ok, false);
  assert.match(resWeak.error || "", /mot de passe ne respecte pas les critères/);
});

test("company registration: non-existent SIRET/SIREN returns confirmation error", async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url: RequestInfo | URL) => {
    const urlStr = String(url);
    if (urlStr.includes("recherche-entreprises.api.gouv.fr/search?q=00000000000000")) {
      return new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return originalFetch(url);
  };

  try {
  const formNotFound = new FormData();
  formNotFound.set("companyName", "Entreprise Inexistante");
  formNotFound.set("userName", "Inconnu Test");
  formNotFound.set("email", "notfound@example.com");
  formNotFound.set("password", "Recrutement@2026!");
  formNotFound.set("country", "France");
  formNotFound.set("siret", "00000000000000");

  const resNotFound = await registerCompany(formNotFound);
  assert.equal(resNotFound.ok, false);
  assert.match(resNotFound.error || "", /Ce SIREN ou SIRET n’a pas été confirmé par le registre public/);
  } finally {
    global.fetch = originalFetch;
  }
});

test("company registration: public registry unavailability error handling", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => {
    return new Response("Service Unavailable", { status: 503 });
  };

  try {
    const formServiceDown = new FormData();
    formServiceDown.set("companyName", "Down Corp");
    formServiceDown.set("userName", "Down User");
    formServiceDown.set("email", "down@example.com");
    formServiceDown.set("password", "Recrutement@2026!");
    formServiceDown.set("country", "France");
    formServiceDown.set("siret", "11111111111111");

    const res = await registerCompany(formServiceDown);
    assert.equal(res.ok, false);
    assert.match(res.error || "", /Le registre public des entreprises est momentanément indisponible/);
  } finally {
    global.fetch = originalFetch;
  }
});

test("company registration: foreign company does not require French SIRET/SIREN", async () => {
  const emailForeign = `foreign.${Date.now()}@example.ch`;
  const formForeign = new FormData();
  formForeign.set("companyName", "Geneva Advisory Sàrl");
  formForeign.set("userName", "Marc Dupont");
  formForeign.set("email", emailForeign);
  formForeign.set("password", "Recrutement@2026!");
  formForeign.set("country", "Suisse");
  formForeign.set("address", "Rue du Rhône 12, 1204 Genève");
  formForeign.set("website", "https://geneva-advisory.ch");
  formForeign.set("phonePrefix", "+41");
  formForeign.set("phone", "22 123 45 67");

  if (!process.env.DATABASE_URL) {
    console.log("Skipping DB write assertion: DATABASE_URL not set");
    return;
  }

  const res = await registerCompany(formForeign);
  assert.equal(res.ok, true);
  assert.equal(res.email, emailForeign);

  const createdUser = await prisma.user.findUnique({
    where: { email: emailForeign },
    include: {
      companyLinks: {
        include: { company: true },
      },
    },
  });

  assert.ok(createdUser);
  assert.equal(createdUser.role, "ENTREPRISE");
  assert.equal(createdUser.companyLinks.length, 1);
  assert.equal(createdUser.companyLinks[0].role, "OWNER");
  assert.equal(createdUser.companyLinks[0].company.country, "Suisse");
  assert.equal(createdUser.companyLinks[0].company.name, "Geneva Advisory Sàrl");

  const duplicateRes = await registerCompany(formForeign);
  assert.equal(duplicateRes.ok, false);
  assert.match(duplicateRes.error || "", /Un compte existe déjà avec cette adresse e-mail/);

  await prisma.companyMember.deleteMany({ where: { userId: createdUser.id } });
  await prisma.company.delete({ where: { id: createdUser.companyLinks[0].companyId } });
  await prisma.user.delete({ where: { id: createdUser.id } });
});

test("company registration: platform OWNER account cannot be overwritten or altered", async () => {
  if (!process.env.DATABASE_URL) {
    console.log("Skipping DB OWNER security check: DATABASE_URL not set");
    return;
  }

  const ownerEmail = `test.platform.owner.${Date.now()}@recrutement-prive.com`;
  const owner = await prisma.user.create({
    data: {
      name: "Platform Owner",
      email: ownerEmail,
      role: "OWNER",
    },
  });

  try {
    const formAttempt = new FormData();
    formAttempt.set("companyName", "Attacker Corp");
    formAttempt.set("userName", "Malicious Actor");
    formAttempt.set("email", ownerEmail);
    formAttempt.set("password", "Recrutement@2026!");
    formAttempt.set("country", "Suisse");

    const res = await registerCompany(formAttempt);
    assert.equal(res.ok, false);
    assert.match(res.error || "", /Un compte existe déjà avec cette adresse e-mail/);

    const checkOwner = await prisma.user.findUnique({ where: { id: owner.id } });
    assert.ok(checkOwner);
    assert.equal(checkOwner.role, "OWNER");
    assert.equal(checkOwner.name, "Platform Owner");
  } finally {
    await prisma.user.delete({ where: { id: owner.id } });
  }
});

test("company registration: accepts valid French SIREN by resolving head-office SIRET and prefilling company info", async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url: RequestInfo | URL) => {
    const urlStr = String(url);
    if (urlStr.includes("recherche-entreprises.api.gouv.fr/search?q=123456789")) {
      return new Response(
        JSON.stringify({
          results: [
            {
              siren: "123456789",
              nom_complet: "ACME FRANCE SAS",
              nature_juridique: "SAS",
              siege: {
                siret: "12345678900014",
                activite_principale: "62.01Z",
                adresse: {
                  numero_voie: "10",
                  type_voie: "rue",
                  libelle_voie: "de la Paix",
                  code_postal: "75001",
                  libelle_commune: "Paris",
                },
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return originalFetch(url);
  };

  const emailSiren = `acme.${Date.now()}@example.fr`;
  try {
    const formSiren = new FormData();
    formSiren.set("companyName", "ACME France");
    formSiren.set("userName", "Alice Recruteur");
    formSiren.set("email", emailSiren);
    formSiren.set("password", "Recrutement@2026!");
    formSiren.set("country", "France");
    formSiren.set("siret", "123456789");

    if (!process.env.DATABASE_URL) {
      console.log("Skipping DB write assertion: DATABASE_URL not set");
      return;
    }

    const res = await registerCompany(formSiren);
    assert.equal(res.ok, true);

    const user = await prisma.user.findUnique({
      where: { email: emailSiren },
      include: { companyLinks: true },
    });
    if (user) {
      await prisma.companyMember.deleteMany({ where: { userId: user.id } });
      if (user.companyLinks[0]?.companyId) {
        await prisma.company.delete({ where: { id: user.companyLinks[0].companyId } });
      }
      await prisma.user.delete({ where: { id: user.id } });
    }
  } finally {
    global.fetch = originalFetch;
  }
});

test("company registration: accepts valid French 14-digit SIRET directly", async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url: RequestInfo | URL) => {
    const urlStr = String(url);
    if (urlStr.includes("recherche-entreprises.api.gouv.fr/search?q=98765432100019")) {
      return new Response(
        JSON.stringify({
          results: [
            {
              siren: "987654321",
              siret: "98765432100019",
              nom_complet: "DIRECT SIRET CORP",
              siege: {
                siret: "98765432100019",
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return originalFetch(url);
  };

  const emailSiret = `direct.${Date.now()}@example.fr`;
  try {
    const formSiret = new FormData();
    formSiret.set("companyName", "Direct Siret Corp");
    formSiret.set("userName", "Bob Recruteur");
    formSiret.set("email", emailSiret);
    formSiret.set("password", "Recrutement@2026!");
    formSiret.set("country", "France");
    formSiret.set("siret", "98765432100019");

    if (!process.env.DATABASE_URL) {
      console.log("Skipping DB write assertion: DATABASE_URL not set");
      return;
    }

    const res = await registerCompany(formSiret);
    assert.equal(res.ok, true);

    const user = await prisma.user.findUnique({
      where: { email: emailSiret },
      include: { companyLinks: true },
    });
    if (user) {
      await prisma.companyMember.deleteMany({ where: { userId: user.id } });
      if (user.companyLinks[0]?.companyId) {
        await prisma.company.delete({ where: { id: user.companyLinks[0].companyId } });
      }
      await prisma.user.delete({ where: { id: user.id } });
    }
  } finally {
    global.fetch = originalFetch;
  }
});
