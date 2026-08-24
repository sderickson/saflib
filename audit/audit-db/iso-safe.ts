/** ISO-8601 with `:` replaced by `-` (filesystem-friendly). */
export function isoSafe(date: Date): string {
  return date.toISOString().replace(/:/g, "-");
}
