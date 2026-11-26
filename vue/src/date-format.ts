const shortDateTime = new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" });

/**
 * The admin's compact timestamp for tables: "11/26/26 8:30 AM" (in the
 * viewer's locale). "—" for null, empty or unparseable values.
 */
export function formatShortDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return shortDateTime.format(date).replace(", ", " ");
}
