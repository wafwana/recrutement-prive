import test from "node:test";
import assert from "node:assert/strict";
import {
  PARTNER_CATEGORIES,
  PARTNER_STATUSES,
  isRecruitmentPlatform,
  getCategoryLabel,
  getSubcategoryLabel,
  getStatusLabel,
} from "../lib/partenaires/taxonomy";
import {
  searchPartners,
  createPartner,
  updatePartnerStatus,
  addPartnerContact,
  deletePartnerContact,
  createPartnerAgreement,
  deletePartnerAgreement,
} from "../lib/partenaires/partner-service";
import { discoverInstitutionalPartners } from "../lib/partenaires/sourcing";

test("Partenaires Taxonomy & Categories Validation", () => {
  const categoryCodes = PARTNER_CATEGORIES.map((c) => c.code);
  assert.ok(categoryCodes.includes("UNIVERSITES_ECOLES"), "UNIVERSITES_ECOLES category missing");
  assert.ok(categoryCodes.includes("CHAMBRES_COMMERCE"), "CHAMBRES_COMMERCE category missing");
  assert.ok(categoryCodes.includes("ONG_ASSOCIATIONS"), "ONG_ASSOCIATIONS category missing");
  assert.ok(categoryCodes.includes("RESEAUX_EXPATRIES"), "RESEAUX_EXPATRIES category missing");
  assert.ok(categoryCodes.includes("AUTRES_PARTENAIRES"), "AUTRES_PARTENAIRES category missing");

  const expatCat = PARTNER_CATEGORIES.find((c) => c.code === "RESEAUX_EXPATRIES");
  assert.ok(expatCat);
  const expatSubs = expatCat.subcategories.map((s) => s.code);
  assert.ok(expatSubs.includes("ASSOCIATION_EXPATRIES"));
  assert.ok(expatSubs.includes("COMMUNAUTE_INTERNATIONALE"));
  assert.ok(expatSubs.includes("DIASPORA_PROFESSIONNELLE"));

  assert.equal(getStatusLabel("IDENTIFIED"), "Identifié");
  assert.equal(getStatusLabel("VALIDATED_PARTNER"), "Partenaire validé");

  assert.equal(getCategoryLabel("UNIVERSITES_ECOLES"), "Universités / Écoles / Formation");
  assert.equal(getSubcategoryLabel("UNIVERSITES_ECOLES", "ECOLE_INGENIEUR"), "Écoles d'ingénieurs");
});

test("Strict Exclusion of Recruitment Platforms & Commercial Headhunters", () => {
  assert.equal(isRecruitmentPlatform("Cabinet de Recrutement Executives"), true);
  assert.equal(isRecruitmentPlatform("Chasseur de têtes International"), true);
  assert.equal(isRecruitmentPlatform("Mon Jobboard Pro", "Un site de recrutement"), true);
  assert.equal(isRecruitmentPlatform("Banque de CV Commerciale"), true);
  assert.equal(isRecruitmentPlatform("Agence d'intérim de talents"), true);

  assert.equal(isRecruitmentPlatform("Université Paris-Saclay"), false);
  assert.equal(isRecruitmentPlatform("CCI France International"), false);
  assert.equal(isRecruitmentPlatform("Union des Français de l'Étranger"), false);
  assert.equal(isRecruitmentPlatform("Campus France"), false);
});

test("Institutional Sourcing Engine Discoveries & Data Provenance", async () => {
  const items = await discoverInstitutionalPartners();
  assert.ok(items.length > 0, "Curated institutional partners list should not be empty");

  for (const item of items) {
    assert.ok(item.officialName);
    assert.ok(item.category);
    assert.ok(item.source);
    assert.equal(isRecruitmentPlatform(item.officialName, item.notes, item.website), false);
  }

  const expatItems = await discoverInstitutionalPartners({ category: "RESEAUX_EXPATRIES" });
  assert.ok(expatItems.every((i) => i.category === "RESEAUX_EXPATRIES"));
});

test("Partner Service CRUD & Search (DB dependent or mocked)", async () => {
  if (!process.env.DATABASE_URL) {
    console.log("Skipping DB integration test: DATABASE_URL not configured in environment");
    return;
  }

  const actorOwner = { userId: "user-owner-1", name: "Owner Test", role: "OWNER" };
  const actorConsultant = { userId: "user-consultant-1", name: "Consultant Test", role: "CONSULTANT" };

  const created = await createPartner(
    {
      officialName: "CCI France-Japon",
      usualName: "CCIFJ",
      category: "CHAMBRES_COMMERCE",
      subCategory: "CCI_INTERNATIONALE",
      country: "Japon",
      city: "Tokyo",
      website: "https://www.ccifj.or.jp",
      languages: ["Français", "Japonais", "Anglais"],
      sectors: ["Commerce", "Technologie"],
      priority: "HIGH",
    },
    actorOwner
  );

  assert.ok(created.id);
  assert.equal(created.officialName, "CCI France-Japon");
  assert.equal(created.status, "IDENTIFIED");

  await assert.rejects(
    async () => {
      await createPartner(
        {
          officialName: "Cabinet de Recrutement Externe Pro",
          category: "AUTRES_PARTENAIRES",
        },
        actorOwner
      );
    },
    (err: Error) => err.message.includes("EXCLUSION_RECRUITMENT_PLATFORM")
  );

  const contact = await addPartnerContact(
    created.id,
    {
      name: "Taro Yamada",
      roleTitle: "Directeur des Relations Entreprises",
      email: "t.yamada@ccifj.or.jp",
    },
    actorOwner
  );
  assert.ok(contact.id);
  assert.equal(contact.name, "Taro Yamada");

  const agreement = await createPartnerAgreement(
    created.id,
    {
      title: "Convention Cadre de Coopération Commerciale",
      agreementType: "CONVENTION_PARTENARIAT",
      status: "IN_NEGOTIATION",
      clauses: "Mise en réseau privilégiée des candidats qualifiés.",
    },
    actorOwner
  );
  assert.ok(agreement.id);
  assert.equal(agreement.status, "IN_NEGOTIATION");

  await assert.rejects(
    async () => {
      await updatePartnerStatus(created.id, "VALIDATED_PARTNER", "Validation par consultant", actorConsultant);
    },
    (err: Error) => err.message.includes("FORBIDDEN_ONLY_OWNER")
  );

  const validated = await updatePartnerStatus(
    created.id,
    "VALIDATED_PARTNER",
    "Validation officielle par l'Owner",
    actorOwner
  );
  assert.equal(validated.status, "VALIDATED_PARTNER");

  const searchRes = await searchPartners({
    q: "CCIFJ",
    category: "CHAMBRES_COMMERCE",
    status: "VALIDATED_PARTNER",
  });
  assert.ok(searchRes.items.some((item) => item.id === created.id));

  await deletePartnerAgreement(created.id, agreement.id, actorOwner);
  await deletePartnerContact(created.id, contact.id, actorOwner);
});
