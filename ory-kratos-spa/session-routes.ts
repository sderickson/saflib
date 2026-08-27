import type { RouteRecordRaw } from "vue-router";
import { authLinks } from "@saflib/ory-kratos-sdk/links";
import settingsAsync from "./pages/settings/SettingsAsync.vue";
import newSettingsAsync from "./pages/new-settings/NewSettingsAsync.vue";
import verifyWallAsync from "./pages/verify-wall/VerifyWallAsync.vue";

/**
 * Logged-in / session Kratos pages that products may mount on auth **or**
 * account (or omit when embedding {@link SettingsSectionAsync} instead).
 *
 * Spread into `createKratosAuthRouter({ additionalRoutes })` when the auth SPA
 * should still expose `/settings`, `/new-settings`, and `/verify-wall`.
 */
export function kratosSessionRouteRecords(): RouteRecordRaw[] {
  return [
    {
      path: authLinks.settings.path,
      component: settingsAsync,
    },
    {
      path: authLinks.newSettings.path,
      component: newSettingsAsync,
    },
    {
      path: authLinks.verifyWall.path,
      component: verifyWallAsync,
    },
  ];
}
