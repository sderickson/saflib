/**
 * An advisory a person decided to live with for now (no fixed version, or the
 * vulnerable path isn't used). Accepted advisories stay in the report but
 * aren't `actionable`, so they don't page or count toward `needs_attention`.
 */
export interface AcceptedAdvisory {
  /** OSV id or any alias (GHSA-…, CVE-…). */
  id: string;
  /** Why it's accepted; shown next to the advisory. */
  reason: string;
  /** YYYY-MM-DD: the acceptance lapses after this day, so it gets looked at again. */
  until?: string;
}

/** The acceptance covering an advisory with these ids, if any is in force on `now`. */
export function findAcceptance(
  ids: string[],
  accepted: AcceptedAdvisory[],
  now: Date,
): AcceptedAdvisory | undefined {
  return accepted.find(
    (a) =>
      ids.includes(a.id) &&
      (a.until === undefined || now.getTime() < Date.parse(a.until) + 86_400_000),
  );
}

/**
 * Advisories in packages saflib brings in, accepted for every product. Each
 * product's `acceptedAdvisories` adds to these. Review when one lapses.
 */
export const SAFLIB_ACCEPTED_ADVISORIES: AcceptedAdvisory[] = [
  {
    id: "GHSA-mrhx-c7xc-m3w5",
    reason:
      "zod 3 via @infisical/sdk (saflib/vendors/infisical), which requires zod ^3; the fix is zod 4. Revisit when @infisical/sdk moves to zod 4.",
    until: "2027-02-09",
  },
];
