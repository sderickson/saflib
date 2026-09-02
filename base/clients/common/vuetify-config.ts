import { h } from "vue";
import type { IconProps, IconSet } from "vuetify";
import type { VuetifyOptions } from "vuetify";
import { aliases, mdi as mdiSvg } from "vuetify/iconsets/mdi-svg";
import { mdiIconPaths } from "./assets/mdi-icons.ts";

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

/**
 * Brand palette for the Base reference product.
 * Adjust these values when forking Base — marketing components and layouts read
 * `--v-theme-*` CSS variables from this theme.
 */
const baseLightTheme = {
  dark: false,
  colors: {
    primary: "#0F766E",
    secondary: "#0369A1",
    "secondary-container": "#E0F2FE",
    info: "#0369A1",
    success: "#059669",
    warning: "#D97706",
    error: "#DC2626",
    background: "#F8FAFC",
    surface: "#F1F5F9",
    "surface-bright": "#F0FDFA",
    "surface-variant": "#0F172A",
    outline: "#CBD5E1",
  },
} as const;

/**
 * Shared Vuetify options for Base web clients.
 *
 * - **SPAs** — pass to `createSpaMain({ vuetifyConfig })` in each client `main.ts`.
 * - **Static sites (VitePress)** — `createVuetify(vuetifyConfig)` in `.vitepress/theme/index.ts`.
 *
 * One config keeps app, auth, admin, account, and marketing pages on the same palette.
 */
export const vuetifyConfig = {
  icons: {
    defaultSet: "mdi",
    aliases,
    sets: {
      mdi,
    },
  },
  defaults: {
    VAlert: {
      variant: "tonal",
    },
    VAppBar: {
      flat: true,
      elevation: 0,
    },
    VBtn: {
      rounded: "lg",
    },
    VCard: {
      rounded: "lg",
    },
  },
  theme: {
    defaultTheme: "light",
    themes: {
      light: baseLightTheme,
    },
  },
} satisfies VuetifyOptions;
