/**
 * Build nested `traits` objects for Kratos JSON APIs from `FormData` keys like `traits.name.first`
 * or `traits.name\.first` (Kratos escapes dots in nested JSON pointer segments).
 */

function setNestedTrait(
  traits: Record<string, unknown>,
  dottedPath: string,
  value: string,
): void {
  const segments = dottedPath.split(".").filter(Boolean);
  if (segments.length === 0) return;
  let cur: Record<string, unknown> = traits;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i]!;
    const next = cur[seg];
    if (
      next === undefined ||
      typeof next !== "object" ||
      next === null ||
      Array.isArray(next)
    ) {
      cur[seg] = {};
    }
    cur = cur[seg] as Record<string, unknown>;
  }
  cur[segments[segments.length - 1]!] = value;
}

/** After the `traits.` prefix: unescape `\.` then split on `.` into nested keys. */
export function normalizeKratosTraitPathFromFormKey(key: string): string | null {
  if (!key.startsWith("traits.")) return null;
  const raw = key.slice("traits.".length);
  if (!raw) return null;
  return raw.replace(/\\\./g, ".");
}

export function traitsRecordFromFormData(fd: FormData): Record<string, unknown> {
  const traits: Record<string, unknown> = {};
  fd.forEach((value, key) => {
    const path = normalizeKratosTraitPathFromFormKey(key);
    if (path == null) return;
    setNestedTrait(traits, path, String(value).trim());
  });
  return traits;
}
