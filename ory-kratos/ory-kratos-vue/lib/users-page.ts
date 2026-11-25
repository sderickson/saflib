import type { IdentityRecord } from "@saflib/ory-kratos-spec";

/** A link the product adds to a person's detail panel. */
export interface UserPageLink {
  label: string;
  /** Router path inside the admin app. */
  to?: string;
  /** External URL. */
  href?: string;
}

export interface UsersPageConfig {
  /** Product links for a person, e.g. their WhatsApp thread. */
  extraLinks?: (identity: IdentityRecord) => UserPageLink[];
}

let config: UsersPageConfig = {};

/** Products call this once to add their own links to the Users page. */
export function configureUsersPage(next: UsersPageConfig) {
  config = next;
}

export function getUsersPageConfig(): UsersPageConfig {
  return config;
}

/** "3 min ago", "2 days ago", or a date for anything older than a month. */
export function formatRelative(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "Never";
  const then = new Date(iso).getTime();
  const s = Math.round((now - then) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (s < 60) return rtf.format(-s, "second");
  if (s < 3600) return rtf.format(-Math.round(s / 60), "minute");
  if (s < 86400) return rtf.format(-Math.round(s / 3600), "hour");
  if (s < 30 * 86400) return rtf.format(-Math.round(s / 86400), "day");
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
