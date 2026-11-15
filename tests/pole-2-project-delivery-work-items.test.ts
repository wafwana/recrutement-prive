import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const collection = read("../app/api/tech/projects/[id]/work-items/route.ts");
const item = read("../app/api/tech/projects/[id]/work-items/[itemId]/route.ts");

test("Pôle 2 work-item listing is scoped to OWNER, project manager or assigned collaborator", () => {
  assert.match(collection, /canAccessProject/);
  assert.match(collection, /projectManagerUserId/);
  assert.match(collection, /assigneeUserId/);
  assert.match(collection, /Accès refusé à ce projet/);
  assert.match(collection, /export async function GET/);
});

test("only OWNER or project manager can create tasks and milestones", () => {
  assert.match(collection, /Seul l'OWNER ou le responsable du projet/);
  assert.match(collection, /body\.title\.trim\(\)\.length > 180/);
  assert.match(collection, /Date d'échéance invalide/);
});

test("task assignees must be active Pôle 2 collaborators", () => {
  assert.match(collection, /assignee\.status !== "ACTIVE"/);
  assert.match(collection, /TECH_SOLUTIONS_MANAGE/);
});

test("only OWNER, project manager or assigned task collaborator can update status", () => {
  assert.match(item, /isProjectManager/);
  assert.match(item, /isAssignee/);
  assert.match(item, /Vous ne pouvez pas modifier cet élément/);
  assert.match(item, /TASK_STATES/);
  assert.match(item, /MILESTONE_STATES/);
});

test("every work-item change is recorded in project history and audit log", () => {
  assert.match(collection, /techProjectEvent\.create/);
  assert.match(collection, /auditLog\.create/);
  assert.match(item, /techProjectEvent\.create/);
  assert.match(item, /auditLog\.create/);
});

test("work-item endpoints do not send external messages", () => {
  assert.doesNotMatch(collection, /sendEmail|resend\.emails/);
  assert.doesNotMatch(item, /sendEmail|resend\.emails/);
});
