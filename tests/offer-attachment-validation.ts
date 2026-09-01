import { strict as assert } from "node:assert";
import { prisma } from "@/lib/prisma";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("DATABASE_URL non configurée, vérification du schéma Prisma statique...");
    const schema = await import("node:fs").then((fs) => fs.readFileSync("prisma/schema.prisma", "utf-8"));
    assert.ok(schema.includes("attachmentName"), "Prisma schema must include attachmentName");
    assert.ok(schema.includes("attachmentMimeType"), "Prisma schema must include attachmentMimeType");
    assert.ok(schema.includes("attachmentData"), "Prisma schema must include attachmentData");
    console.log("Offer attachment schema validation (static): PASS");
    return;
  }
  const fields = await prisma.$queryRaw<Array<{ attachmentName: string | null; attachmentMimeType: string | null }>>`
    SELECT "attachmentName", "attachmentMimeType" FROM "Job" LIMIT 1
  `;
  assert.ok(Array.isArray(fields), "La colonne de pièce jointe doit être interrogeable.");
  console.log("Offer attachment schema validation: PASS");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => prisma.$disconnect());
