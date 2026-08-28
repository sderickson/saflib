import { h } from "vue";
import type { IconProps, IconSet } from "vuetify";
import { aliases, mdi as mdiSvg } from "vuetify/iconsets/mdi-svg";
import { mdiIconPaths } from "./mdi-icons.ts";

/** Resolve `mdi-*` class names to SVG paths; pass through paths / other values. */
function resolveMdiIcon(icon: IconProps["icon"]): IconProps["icon"] {
  if (typeof icon !== "string") {
    return icon;
  }
  if (Object.hasOwn(mdiIconPaths, icon)) {
    return mdiIconPaths[icon]!;
  }
  if (icon.startsWith("mdi-") && import.meta.env.DEV) {
    console.warn(
      `[vuetify] Unknown MDI icon "${icon}" — add it to base/clients/common/mdi-icons.ts`,
    );
  }
  return icon;
}

/**
 * SVG MDI set that still accepts template strings like `icon="mdi-plus"`
 * (webfont class names) by looking them up in {@link mdiIconPaths}.
 */
const mdi: IconSet = {
  component: (props) =>
    h(mdiSvg.component, {
      ...props,
      icon: resolveMdiIcon(props.icon),
    }),
};

export const vuetifyConfig = {
  icons: {
    defaultSet: "mdi",
    aliases,
    sets: {
      mdi,
    },
  },
  defaults: {
    // VAppBar: {
    //   style: `border-bottom: 1px solid black;`,
    // },
  },
  theme: {
    defaultTheme: "light",
    // Customize theme colors here
    themes: {
      light: {
        colors: {
          // primary: "rgb(211, 31, 51)",
          // secondary: "blue",
          // background: "light-gray",
        },
      },
    },
  },
};
