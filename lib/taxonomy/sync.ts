import { prisma } from "@/lib/prisma";
import { RP_TAXONOMY } from "@/lib/taxonomy/rp-taxonomy";

/**
 * Synchronise la taxonomie applicative vers PostgreSQL sans supprimer ni
 * désactiver les catégories existantes. Toute nouvelle entrée de
 * RP_TAXONOMY est donc créée, avec tous ses métiers dérivés.
 */
export async function ensureTaxonomySynced() {
  let sectorsCreated = 0;
  let derivativesCreated = 0;
  let derivativesRepaired = 0;

  for (const sector of RP_TAXONOMY) {
    const existingSector = await prisma.jobCategory.findUnique({
      where: { code: sector.code },
      select: { id: true },
    });

    const parent = await prisma.jobCategory.upsert({
      where: { code: sector.code },
      update: { name: sector.name, isActive: true },
      create: { code: sector.code, name: sector.name, isActive: true },
      select: { id: true },
    });

    if (!existingSector) sectorsCreated += 1;

    const existingChildren = await prisma.jobCategory.findMany({
      where: { parentId: parent.id },
      select: { code: true, parentId: true, isActive: true },
    });
    const existingByCode = new Map(existingChildren.map((child) => [child.code, child]));

    for (const sub of sector.subcategories) {
      const existing = await prisma.jobCategory.findUnique({
        where: { code: sub.code },
        select: { id: true, parentId: true, isActive: true },
      });

      if (!existing) {
        await prisma.jobCategory.create({
          data: { code: sub.code, name: sub.name, parentId: parent.id, isActive: true },
        });
        derivativesCreated += 1;
        continue;
      }

      const current = existingByCode.get(sub.code);
      if (existing.parentId !== parent.id || !existing.isActive) {
        await prisma.jobCategory.update({
          where: { id: existing.id },
          data: { name: sub.name, parentId: parent.id, isActive: true },
        });
        derivativesRepaired += 1;
      } else if (!current || current.parentId !== parent.id || !current.isActive) {
        await prisma.jobCategory.update({
          where: { id: existing.id },
          data: { name: sub.name, parentId: parent.id, isActive: true },
        });
        derivativesRepaired += 1;
      } else {
        await prisma.jobCategory.update({
          where: { id: existing.id },
          data: { name: sub.name },
        });
      }
    }
  }

  return { sectorsCreated, derivativesCreated, derivativesRepaired };
}
