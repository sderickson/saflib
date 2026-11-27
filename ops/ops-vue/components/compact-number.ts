const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

/** 2712 → "2.7K", 3_400_000 → "3.4M", 999 → "999". */
export function compactNumber(n: number): string {
  return compact.format(n);
}
