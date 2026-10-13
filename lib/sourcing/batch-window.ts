export type BatchWindow = { skip: number; take: number; nextOffset: number };

export function selectBatchWindow(total: number, offset: number, limit: number): BatchWindow {
  const safeTotal = Number.isFinite(total) ? Math.max(0, Math.trunc(total)) : 0;
  const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.trunc(limit)) : 0;
  if (safeTotal === 0 || safeLimit === 0) return { skip: 0, take: 0, nextOffset: 0 };

  const rawOffset = Number.isFinite(offset) ? Math.trunc(offset) : 0;
  const skip = ((rawOffset % safeTotal) + safeTotal) % safeTotal;
  const take = Math.min(safeLimit, safeTotal - skip);
  return { skip, take, nextOffset: (skip + take) % safeTotal };
}
