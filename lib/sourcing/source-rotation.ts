import { selectBatchWindow } from "./batch-window";

export type SourceRotation = {
  source: string | null;
  index: number | null;
  nextOffset: number;
  total: number;
};

/** Select exactly one source and return a persistent cursor for the next invocation. */
export function selectNextSource(sources: readonly string[], offset: number): SourceRotation {
  const window = selectBatchWindow(sources.length, offset, 1);
  if (window.take === 0) {
    return { source: null, index: null, nextOffset: 0, total: 0 };
  }

  return {
    source: sources[window.skip] ?? null,
    index: window.skip,
    nextOffset: window.nextOffset,
    total: sources.length,
  };
}
