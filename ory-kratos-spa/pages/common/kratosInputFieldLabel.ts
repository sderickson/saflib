/**
 * When Kratos omits `meta.label` (common for nested identity schema fields), provide a readable label.
 */
export function kratosFallbackLabelForInputName(
  name: string | undefined,
): string | undefined {
  if (!name) return undefined;
  const n = name.replace(/\\\./g, ".");
  switch (n) {
    case "traits.name.first":
      return "First name";
    case "traits.name.last":
      return "Last name";
    default:
      return undefined;
  }
}
