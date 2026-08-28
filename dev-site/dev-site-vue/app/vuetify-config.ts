import { h } from "vue";
import type { IconProps, IconSet, VuetifyOptions } from "vuetify";
import { aliases, mdi as mdiSvg } from "vuetify/iconsets/mdi-svg";
import { mdiIconPaths } from "./mdi-icons.ts";

function resolveMdiIcon(icon: IconProps["icon"]): IconProps["icon"] {
  if (typeof icon !== "string") return icon;
  if (Object.hasOwn(mdiIconPaths, icon)) return mdiIconPaths[icon]!;
  if (icon.startsWith("mdi-") && import.meta.env.DEV) {
    console.warn(
      `[dev-site] Unknown MDI icon "${icon}" — add it to dev-site-vue/app/mdi-icons.ts`,
    );
  }
  return icon;
}

const mdi: IconSet = {
  component: (props) =>
    h(mdiSvg.component, {
      ...props,
      icon: resolveMdiIcon(props.icon),
    }),
};

export type CreateDevSiteVuetifyConfigOptions = {
  /** Optional product theme merged beneath dev-site MDI icon wiring. */
  theme?: VuetifyOptions;
};

/** Default dev-site Vuetify config (MDI SVG iconset). Pass `theme` to extend a product palette. */
export function createDevSiteVuetifyConfig(
  options: CreateDevSiteVuetifyConfigOptions = {},
): VuetifyOptions {
  const { theme } = options;
  return {
    ...theme,
    icons: {
      defaultSet: "mdi",
      aliases,
      sets: { mdi },
    },
  };
}

/** Standalone dev-site theme (no product palette). */
export const devSiteVuetifyConfig = createDevSiteVuetifyConfig();
