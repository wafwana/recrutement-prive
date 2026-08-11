import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

async function main() {
  const email = process.env.DEMO_ADMIN_EMAIL ?? "admin@recrutement-prive.fr";
  const password = process.env.DEMO_ADMIN_PASSWORD ?? "ChangeMe-Admin-2026!";

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: "Administrateur",
      email,
      passwordHash: await hashPassword(password),
      role: "ADMIN",
    },
  });

  console.log(`Demo admin ensured: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
