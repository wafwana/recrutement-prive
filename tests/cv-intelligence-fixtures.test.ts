import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import path from "node:path";
import { analyzeCvDocument, buildCvFileContent, extractTextFromCvBuffer, parseCvTextLocally, type CvTaxonomyItem } from "../lib/cv/analyzer";

// Fixtures synthétiques : aucune donnée personnelle réelle.
const FIXTURES = [
  { file: "CV-01-ingenieur-data-ia.txt", expected: "IT", keywords: ["Python", "machine learning", "SQL"] },
  { file: "CV-02-business-development-b2b.txt", expected: "COMMERCIAL", keywords: ["vente B2B", "CRM", "grands comptes"] },
  { file: "CV-03-recrutement-talent.txt", expected: "RH", keywords: ["recrutement", "sourcing", "Talent Acquisition"] },
  { file: "CV-04-audit-finance.txt", expected: "FINANCE", keywords: ["audit", "IFRS", "contrôle interne"] },
  { file: "CV-05-profil-transversal-projet.txt", expected: "IT", keywords: ["gestion de projet", "API", "avant-vente"] },
] as const;

const TAXONOMY: CvTaxonomyItem[] = [
  { code: "FINANCE", name: "Finance" },
  { code: "COMPTABILITE", name: "Comptabilité", parentCode: "FINANCE" },
  { code: "AUDIT", name: "Audit", parentCode: "FINANCE" },
  { code: "IT", name: "Informatique & Tech" },
  { code: "DEV_LOGICIEL", name: "Développement logiciel", parentCode: "IT" },
  { code: "DATA_IA", name: "Data / IA", parentCode: "IT" },
  { code: "RH", name: "Ressources Humaines" },
  { code: "RECRUTEMENT", name: "Recrutement / Talent Acquisition", parentCode: "RH" },
  { code: "COMMERCIAL", name: "Commercial & Business" },
  { code: "VENTE_B2B", name: "Vente B2B", parentCode: "COMMERCIAL" },
  { code: "BUSINESS_DEV", name: "Business Development", parentCode: "COMMERCIAL" },
] as const;

test("OpenAI CV file and JPEG inputs use MIME-qualified base64 data URLs", () => {
  const bytes = Buffer.from("synthetic CV bytes");
  const pdf = buildCvFileContent({ fileName: "cv.pdf", mimeType: "application/pdf", buffer: bytes });
  assert.deepEqual(pdf, {
    type: "input_file",
    filename: "cv.pdf",
    file_data: `data:application/pdf;base64,${bytes.toString("base64")}`,
  });

  const jpeg = buildCvFileContent({ fileName: "cv.jpg", mimeType: "image/jpeg", buffer: bytes });
  assert.deepEqual(jpeg, {
    type: "input_image",
    image_url: `data:image/jpeg;base64,${bytes.toString("base64")}`,
    detail: "auto",
  });
});

test("CV fixtures: contenu professionnel et secteurs attendus", async () => {
  for (const fixture of FIXTURES) {
    const content = await readFile(path.join(process.cwd(), "tests/fixtures/cv", fixture.file), "utf8");
    assert.match(content, /CV TEST/);
    for (const keyword of fixture.keywords) {
      assert.ok(content.toLocaleLowerCase().includes(keyword.toLocaleLowerCase()), `Mot-clé absent: ${keyword}`);
    }
    assert.ok(fixture.expected.length > 0);
  }
});

test("Local CV parser extracts facts deterministically when AI provider is absent", async () => {
  const originalProvider = process.env.AI_PROVIDER;
  const originalOpenAiKey = process.env.OPENAI_API_KEY;
  const originalGeminiKey = process.env.GEMINI_API_KEY;

  try {
    delete process.env.AI_PROVIDER;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    for (const fixture of FIXTURES) {
      const buffer = await readFile(path.join(process.cwd(), "tests/fixtures/cv", fixture.file));
      const analysis = await analyzeCvDocument({
        fileName: fixture.file,
        mimeType: "text/plain",
        buffer,
        taxonomy: TAXONOMY,
      });

      assert.ok(analysis, `Local analysis failed for ${fixture.file}`);
      assert.ok(analysis.skills.length > 0, `Skills should be extracted for ${fixture.file}`);
      assert.ok(analysis.confidence > 0, `Confidence should be positive for ${fixture.file}`);
    }
  } finally {
    if (originalProvider) process.env.AI_PROVIDER = originalProvider; else delete process.env.AI_PROVIDER;
    if (originalOpenAiKey) process.env.OPENAI_API_KEY = originalOpenAiKey; else delete process.env.OPENAI_API_KEY;
    if (originalGeminiKey) process.env.GEMINI_API_KEY = originalGeminiKey; else delete process.env.GEMINI_API_KEY;
  }
});

test("Local CV parser handles empty, corrupt, or unsupported binary buffers gracefully without throwing", async () => {
  const originalProvider = process.env.AI_PROVIDER;
  const originalOpenAiKey = process.env.OPENAI_API_KEY;
  const originalGeminiKey = process.env.GEMINI_API_KEY;

  try {
    delete process.env.AI_PROVIDER;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    // Empty buffer
    const emptyRes = await analyzeCvDocument({
      fileName: "empty.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.alloc(0),
      taxonomy: TAXONOMY,
    });
    assert.equal(emptyRes, null, "Empty buffer should return null without throwing");

    // Corrupted pseudo-binary
    const corruptRes = await analyzeCvDocument({
      fileName: "corrupt.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: Buffer.from("INVALID_BINARY_STREAM_CONTENT_NON_ZIP"),
      taxonomy: TAXONOMY,
    });
    assert.equal(corruptRes, null, "Corrupt binary stream should return null without throwing");
  } finally {
    if (originalProvider) process.env.AI_PROVIDER = originalProvider; else delete process.env.AI_PROVIDER;
    if (originalOpenAiKey) process.env.OPENAI_API_KEY = originalOpenAiKey; else delete process.env.OPENAI_API_KEY;
    if (originalGeminiKey) process.env.GEMINI_API_KEY = originalGeminiKey; else delete process.env.GEMINI_API_KEY;
  }
});

test("Zero AI network calls during local CV parsing when AI provider is unconfigured", async () => {
  const originalProvider = process.env.AI_PROVIDER;
  const originalOpenAiKey = process.env.OPENAI_API_KEY;
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;

  let fetchCount = 0;
  globalThis.fetch = (async () => {
    fetchCount++;
    throw new Error("NETWORK_CALL_UNEXPECTED: Local CV analysis must never make network calls!");
  }) as typeof globalThis.fetch;

  try {
    delete process.env.AI_PROVIDER;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const buffer = await readFile(path.join(process.cwd(), "tests/fixtures/cv/CV-01-ingenieur-data-ia.txt"));
    const analysis = await analyzeCvDocument({
      fileName: "CV-01-ingenieur-data-ia.txt",
      mimeType: "text/plain",
      buffer,
      taxonomy: TAXONOMY,
    });

    assert.ok(analysis);
    assert.equal(fetchCount, 0, "Network fetch count must remain 0 during local CV parsing!");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalProvider) process.env.AI_PROVIDER = originalProvider; else delete process.env.AI_PROVIDER;
    if (originalOpenAiKey) process.env.OPENAI_API_KEY = originalOpenAiKey; else delete process.env.OPENAI_API_KEY;
    if (originalGeminiKey) process.env.GEMINI_API_KEY = originalGeminiKey; else delete process.env.GEMINI_API_KEY;
  }
});

test("Local deterministic parser returns no invented identity or experience facts", () => {
  const parsed = parseCvTextLocally("CV TEST\\nCompétences: Python, SQL\\nLangues: français, anglais", TAXONOMY);
  assert.equal(parsed.firstName, undefined);
  assert.equal(parsed.experienceYears, null);
  assert.deepEqual(parsed.skills, ["Python", "SQL"]);
  assert.deepEqual(parsed.languages, ["Français", "Anglais"]);
  assert.deepEqual(parsed, parseCvTextLocally("CV TEST\\nCompétences: Python, SQL\\nLangues: français, anglais", TAXONOMY));
});

test("Local text extraction handles empty and unsupported inputs safely", async () => {
  assert.equal(await extractTextFromCvBuffer(Buffer.alloc(0), "application/pdf", "empty.pdf"), null);
  assert.equal(await extractTextFromCvBuffer(Buffer.from([0, 1, 2, 3]), "application/octet-stream", "binary.bin"), null);
  assert.equal(await extractTextFromCvBuffer(Buffer.from("# Skills\\nPython"), "text/markdown", "skills.md"), "# Skills\\nPython");
});

test(
  "CV fixtures: analyse IA optionnelle et secteurs alternatifs",
  { skip: process.env.RUN_LIVE_CV_ANALYSIS !== "1" },
  async () => {
    assert.ok(process.env.OPENAI_API_KEY, "OPENAI_API_KEY requis pour l'analyse live");
    for (const fixture of FIXTURES) {
      const buffer = await readFile(path.join(process.cwd(), "tests/fixtures/cv", fixture.file));
      const analysis = await analyzeCvDocument({
        fileName: fixture.file,
        mimeType: "text/plain",
        buffer,
        taxonomy: TAXONOMY,
      });
      assert.ok(analysis, `Analyse absente pour ${fixture.file}`);
      assert.ok(analysis.confidence >= 0 && analysis.confidence <= 1);
      assert.ok(analysis.primaryCategoryCode);
      assert.ok(analysis.alternativeCategoryCodes.length <= 3);
    }
  },
);
