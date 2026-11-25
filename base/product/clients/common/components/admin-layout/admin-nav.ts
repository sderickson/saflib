import type { Link } from "@saflib/links";

export interface AdminNavItem extends Link {
  name: string;
  /** Count shown beside the item; hidden when 0 or undefined. */
  badge?: number;
  /** Vuetify color for the badge (e.g. "warning", "error"). */
  badgeColor?: string;
}

export interface AdminNavGroup {
  /** Section heading; omit for an unlabelled top group (e.g. Overview). */
  label?: string;
  /** Small note beside the heading, e.g. "local only". */
  tag?: string;
  items: AdminNavItem[];
}

/** Drops empty groups so callers can build them conditionally. */
export const nonEmptyGroups = (groups: AdminNavGroup[]) =>
  groups.filter((g) => g.items.length > 0);
