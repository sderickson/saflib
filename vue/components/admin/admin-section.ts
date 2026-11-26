import type { InjectionKey } from "vue";

/** Provided by AdminSection: pages inside it let the section title them. */
export const adminSectionKey: InjectionKey<true> = Symbol("adminSection");

export interface AdminSectionTab {
  label: string;
  /** Route path of the tab's page (a child route of the section). */
  to: string;
  /** Count shown beside the label; hidden when 0 or undefined. */
  badge?: number;
}
