import { prisma } from "@/lib/prisma";

type BatchState = { offset: number; updatedAt: string };

const MAX_STATE_OFFSET = 1000000;

export async function readBatchOffset(key: string, total: number): Promise<number> {
  if (total <= 0) return 0;
  const row = await prisma.systemSetting.findUnique({ where: { key }, select: { value: true } });
  const value = row?.value;
  const offset = value && typeof value === "object" && !Array.isArray(value) && "offset" in value && typeof (value as { offset?: unknown }).offset === "number"
    ? Math.trunc((value as { offset: number }).offset)
    : 0;
  return Math.min(Math.max(offset, 0), Math.min(total - 1, MAX_STATE_OFFSET));
}

export async function writeBatchOffset(key: string, offset: number, total: number): Promise<void> {
  const next = total > 0 ? offset % total : 0;
  const value: BatchState = { offset: next, updatedAt: new Date().toISOString() };
  await prisma.systemSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value, updatedAt: new Date() },
  });
}
