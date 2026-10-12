export function selectEnterpriseOfferBatch<T>(items: T[], offset: number, maxOffers = 10): { batch: T[]; nextOffset: number } {
  if (items.length === 0 || maxOffers <= 0) return { batch: [], nextOffset: 0 };
  const safeMax = Math.max(1, Math.trunc(maxOffers));
  const safeOffset = ((Math.trunc(offset) % items.length) + items.length) % items.length;
  const count = Math.min(items.length, safeMax);
  const batch = Array.from({ length: count }, (_, index) => items[(safeOffset + index) % items.length]);
  return { batch, nextOffset: (safeOffset + count) % items.length };
}
