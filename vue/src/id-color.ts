/**
 * Stable colors for ids, so the same request, job or user gets the same color
 * in every table. The palette is chosen to stay distinguishable on light
 * theme surfaces and to differ in lightness as well as hue.
 */
export const ID_PALETTE = [
  "#3F6FD8",
  "#C2410C",
  "#0F8A6A",
  "#8B5CF6",
  "#B7791F",
  "#0E7490",
  "#BE185D",
  "#4D7C0F",
] as const;

/** 32-bit FNV-1a: fast, and well spread for short strings like ids. */
export function hashId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The palette color for an id. */
export function idColor(id: string): string {
  return ID_PALETTE[hashId(id) % ID_PALETTE.length]!;
}

/** Mixes a `#rrggbb` color toward white; `amount` 0 = unchanged, 1 = white. */
export function tint(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Pale background for an avatar or chip keyed by id (dark text stays readable on it). */
export function idTint(id: string): string {
  return tint(idColor(id), 0.78);
}

/**
 * Short, readable form of an id: a type prefix and its first four characters,
 * e.g. `r·7f3a`. Ids with an existing `kind:` prefix (like `ops_token:abc`)
 * use the part after it.
 */
export function shortId(id: string, prefix?: string): string {
  const bare = id.includes(":") ? id.slice(id.lastIndexOf(":") + 1) : id;
  const head = bare.replace(/[^A-Za-z0-9]/g, "").slice(0, 4) || bare.slice(0, 4);
  return prefix ? `${prefix}·${head}` : head;
}
