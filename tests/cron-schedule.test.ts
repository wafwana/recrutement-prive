import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("bounded sourcing cron jobs run hourly in staggered slots to avoid concurrent load spikes", () => {
  const config = JSON.parse(fs.readFileSync("vercel.json", "utf8")) as {
    crons: Array<{ path: string; schedule: string }>;
  };
  const schedules = new Map(config.crons.map((cron) => [cron.path, cron.schedule]));
  assert.equal(schedules.get("/api/cron/global-jobs"), "0 * * * *");
  assert.equal(schedules.get("/api/cron/cv-rematch"), "15 * * * *");
  assert.equal(schedules.get("/api/cron/enterprise-offer-sourcing"), "30 * * * *");
  assert.equal(schedules.get("/api/cron/global-candidates"), "45 * * * *");
  assert.equal(new Set(config.crons.map((cron) => cron.schedule)).size, config.crons.length);
});
