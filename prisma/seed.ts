import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

const DEFAULT_CATEGORIES = [
  {
    code: "FINANCE",
    name: { fr: "Finance", en: "Finance" },
    subcategories: [
      { code: "COMPTABILITE", name: { fr: "Comptabilité", en: "Accounting" } },
      { code: "CONTROLE_DE_GESTION", name: { fr: "Contrôle de gestion", en: "Financial Controlling" } },
      { code: "AUDIT", name: { fr: "Audit", en: "Auditing" } },
      { code: "TRESORERIE", name: { fr: "Trésorerie", en: "Treasury" } },
    ],
  },
  {
    code: "IT",
    name: { fr: "Informatique & Tech", en: "IT & Technology" },
    subcategories: [
      { code: "DEV_LOGICIEL", name: { fr: "Développement logiciel", en: "Software Development" } },
      { code: "DATA_IA", name: { fr: "Data / IA", en: "Data / AI" } },
      { code: "CYBERSECURITE", name: { fr: "Cybersécurité", en: "Cybersecurity" } },
      { code: "CLOUD_DEVOPS", name: { fr: "Cloud / DevOps", en: "Cloud / DevOps" } },
    ],
  },
  {
    code: "RH",
    name: { fr: "Ressources Humaines", en: "Human Resources" },
    subcategories: [
      { code: "RECRUTEMENT", name: { fr: "Recrutement / Talent Acquisition", en: "Recruitment / Talent Acquisition" } },
      { code: "FORMATION", name: { fr: "Formation & GPEC", en: "Training & Development" } },
      { code: "PAIE", name: { fr: "Paie & ADP", en: "Payroll & Admin" } },
    ],
  },
  {
    code: "COMMERCIAL",
    name: { fr: "Commercial & Business", en: "Sales & Business" },
    subcategories: [
      { code: "VENTE_B2B", name: { fr: "Vente B2B", en: "B2B Sales" } },
      { code: "GRANDS_COMPTES", name: { fr: "Grands Comptes / Key Account", en: "Key Account Management" } },
      { code: "BUSINESS_DEV", name: { fr: "Business Development", en: "Business Development" } },
    ],
  },
];

async function seedCategories() {
  for (const cat of DEFAULT_CATEGORIES) {
    const parent = await prisma.jobCategory.upsert({
      where: { code: cat.code },
      update: { name: cat.name },
      create: { code: cat.code, name: cat.name },
    });

    for (const sub of cat.subcategories) {
      await prisma.jobCategory.upsert({
        where: { code: sub.code },
        update: { name: sub.name, parentId: parent.id },
        create: { code: sub.code, name: sub.name, parentId: parent.id },
      });
    }
  }
}

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

  await seedCategories();
  console.log("Taxonomy categories seeded.");
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
