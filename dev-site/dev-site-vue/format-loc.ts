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

/** Signed delta for compare mode (`+12`, `−4`, `0`). */
export function formatLocSigned(delta: number): string {
  if (delta === 0) return "0";
  const mag = formatLoc(Math.abs(delta));
  return delta > 0 ? `+${mag}` : `−${mag}`;
}

/** Checkout compare pair: `+12/−2` source/test vs fork. */
export function formatLocChangePair(sourceDelta: number, testDelta: number): string {
  return `${formatLocSigned(sourceDelta)}/${formatLocSigned(testDelta)}`;
}
