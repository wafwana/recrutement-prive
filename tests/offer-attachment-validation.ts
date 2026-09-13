import { strict as assert } from "node:assert";
import test from "node:test";
import { prisma } from "../lib/prisma";

test("integration test: offer attachment schema columns are queryable", async () => {
  if (!process.env.DATABASE_URL) {
    console.log("Skipping DB integration test: DATABASE_URL not configured in environment");
    return;
  }

  try {
    const fields = await prisma.$queryRaw<Array<{ attachmentName: string | null; attachmentMimeType: string | null }>>`
      SELECT "attachmentName", "attachmentMimeType" FROM "Job" LIMIT 1
    `;
    assert.ok(Array.isArray(fields), "La colonne de pièce jointe doit être interrogeable.");
  } finally {
    await prisma.$disconnect();
  }
});
