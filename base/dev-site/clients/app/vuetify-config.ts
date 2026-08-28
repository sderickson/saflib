import { h } from "vue";
import type { IconProps, IconSet, VuetifyOptions } from "vuetify";
import { aliases, mdi as mdiSvg } from "vuetify/iconsets/mdi-svg";
import { vuetifyConfig as baseVuetifyConfig } from "@saflib/base-clients-common/vuetify-config";
import { mdiIconPaths } from "./mdi-icons.ts";

function resolveMdiIcon(icon: IconProps["icon"]): IconProps["icon"] {
  if (typeof icon !== "string") return icon;
  if (Object.hasOwn(mdiIconPaths, icon)) return mdiIconPaths[icon]!;
  if (icon.startsWith("mdi-") && import.meta.env.DEV) {
    console.warn(
      `[dev-site] Unknown MDI icon "${icon}" — add it to clients/app/mdi-icons.ts`,
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

/** Base product theme plus dev-site icon paths. */
export const vuetifyConfig: VuetifyOptions = {
  ...baseVuetifyConfig,
  icons: {
    defaultSet: "mdi",
    aliases,
    sets: { mdi },
  },
};
