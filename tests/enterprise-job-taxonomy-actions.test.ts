import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("app/espace/entreprise/actions.ts", "utf8");

test("enterprise job create and update schemas accept taxonomy identifiers", () => {
  assert.match(source, /const jobSchema = z\.object\([\s\S]*?jobCategoryId: z\.string\(\)\.trim\(\)\.optional\(\), subCategoryId: z\.string\(\)\.trim\(\)\.optional\(\)/);
  assert.match(source, /const updateJobSchema = z\.object\([\s\S]*?jobCategoryId: z\.string\(\)\.trim\(\)\.optional\(\), subCategoryId: z\.string\(\)\.trim\(\)\.optional\(\)/);
});

test("enterprise job taxonomy rejects inactive, non-root and mismatched categories", () => {
  assert.match(source, /parentCategory\.isActive/);
  assert.match(source, /parentCategory\.parentId !== null/);
  assert.match(source, /subCategory\.isActive/);
  assert.match(source, /subCategory\.parentId !== jobCategoryId/);
  assert.match(source, /Une sous-catégorie requiert une catégorie métier principale/);
});

test("enterprise job creation persists validated primary and secondary categories", () => {
  const createStart = source.indexOf("export async function createCompanyJob");
  const updateStart = source.indexOf("export async function updateCompanyJob");
  const create = source.slice(createStart, updateStart);
  assert.match(create, /jobCategoryId: text\(formData\.get\("jobCategoryId"\)\)/);
  assert.match(create, /subCategoryId: text\(formData\.get\("subCategoryId"\)\)/);
  assert.match(create, /await validateJobTaxonomy\(parsed\.data\.jobCategoryId, parsed\.data\.subCategoryId\)/);
  assert.match(create, /jobCategoryId: parsed\.data\.jobCategoryId \|\| null/);
  assert.match(create, /subCategoryId: parsed\.data\.subCategoryId \|\| null/);
});

test("enterprise job updates preserve existing taxonomy when the form omits taxonomy fields", () => {
  const updateStart = source.indexOf("export async function updateCompanyJob");
  const updateEnd = source.indexOf("export async function presentCandidateToCompany");
  const update = source.slice(updateStart, updateEnd);
  assert.match(update, /const taxonomyProvided = formData\.has\("jobCategoryId"\) \|\| formData\.has\("subCategoryId"\)/);
  assert.match(update, /if \(taxonomyProvided\) \{\s*await validateJobTaxonomy/);
  assert.match(update, /\.\.\.\(taxonomyProvided \? \{ jobCategoryId:/);
});
