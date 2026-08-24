import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

async function ensureUser({
  email,
  password,
  name,
  role,
}: {
  email: string;
  password: string;
  name: string;
  role: "ADMIN" | "OWNER";
}) {
  const passwordHash = await hashPassword(password);
  await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, role },
    create: { name, email, passwordHash, role },
  });
}

async function main() {
  const adminEmail = process.env.DEMO_ADMIN_EMAIL ?? "admin@recrutement-prive.fr";
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD ?? "ChangeMe-Admin-2026!";
  await ensureUser({
    email: adminEmail,
    password: adminPassword,
    name: "Administrateur",
    role: "ADMIN",
  });

  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const ownerPassword = process.env.OWNER_PASSWORD;

  if (ownerEmail && ownerPassword) {
    const existingOwner = await prisma.user.findFirst({ where: { role: "OWNER" } });
    if (existingOwner && existingOwner.email !== ownerEmail) {
      throw new Error(`An OWNER already exists (${existingOwner.email}). Refusing to create a second OWNER.`);
    }

    await ensureUser({
      email: ownerEmail,
      password: ownerPassword,
      name: process.env.OWNER_NAME ?? "Owner Recrutement Privé",
      role: "OWNER",
    });
    console.log(`Owner ensured: ${ownerEmail}`);
  } else {
    console.log("Owner seed skipped: set OWNER_EMAIL and OWNER_PASSWORD to provision the Owner account.");
  }

  console.log(`Demo admin ensured: ${adminEmail}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
