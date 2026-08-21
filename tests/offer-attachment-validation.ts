import { strict as assert } from "node:assert";
import { prisma } from "@/lib/prisma";

async function main() {
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
