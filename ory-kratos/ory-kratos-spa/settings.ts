/**
 * Host-facing settings page exports for embedding Kratos settings in another SPA
 * (e.g. account). Prefer this entry over the package barrel (`index.ts`).
 */
export { default as SettingsSectionAsync } from "./pages/settings/SettingsSectionAsync.vue";
export type { SettingsTabQueryValue } from "./pages/settings/Settings.logic.ts";
