import type { InjectionKey } from "vue";

/**
 * Provided by AdminSection: pages inside it let the section title them, and
 * AdminSubTabs puts a page's own tabs in the section's tab row (`subTabsTarget`
 * is that slot's CSS selector).
 */
export const adminSectionKey: InjectionKey<{ subTabsTarget: string }> = Symbol("adminSection");

export interface AdminSectionTab {
  label: string;
  /** Route path of the tab's page (a child route of the section). */
  to: string;
  /** Count shown beside the label; hidden when 0 or undefined. */
  badge?: number;
}
