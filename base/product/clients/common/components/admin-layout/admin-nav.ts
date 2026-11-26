import type { Link } from "@saflib/links";

export interface AdminNavItem extends Link {
  name: string;
  /** Count shown beside the item; hidden when 0 or undefined. */
  badge?: number;
  /** Vuetify color for the badge (e.g. "warning", "error"). */
  badgeColor?: string;
  /** Other paths this item is active for (a section's other tabs). */
  match?: string[];
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

/** Whether `item` is the current page: its path, or one of its `match` paths, or below one. */
export function isNavItemActive(item: AdminNavItem, path: string): boolean {
  const paths = [item.path, ...(item.match ?? [])];
  return paths.some((p) => (p === "/" ? path === "/" : path === p || path.startsWith(`${p}/`)));
}
