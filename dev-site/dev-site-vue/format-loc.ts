/**
 * Compact display for analyzed line counts.
 * Values under 1000 stay exact (`432`); 1000+ round to thousands (`32k`).
 */
export function formatLoc(n: number): string {
  const v = Math.max(0, Math.round(n));
  if (v < 1000) return String(v);
  return `${Math.round(v / 1000)}k`;
}

/** Checkout-style pair: `32k/4k` or `432/80`. */
export function formatLocPair(sourceLines: number, testLines: number): string {
  return `${formatLoc(sourceLines)}/${formatLoc(testLines)}`;
}
