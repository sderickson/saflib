/**
 * Named MDI SVG paths used by base SPAs and static sites.
 * Keep `mdi-*` string props working with the SVG iconset (no webfont CSS).
 * When adding a new `mdi-…` icon in a template, add the matching `@mdi/js` import here.
 * Auth / identity UI icons come from `@saflib/ory-kratos-spa/mdi-icons`.
 */
import {
  mdiArrowRight,
  mdiClose,
  mdiMenu,
} from "@mdi/js";
import { kratosMdiIconPaths } from "@saflib/ory-kratos-spa/mdi-icons";

export const mdiIconPaths: Record<string, string> = {
  ...kratosMdiIconPaths,
  "mdi-arrow-right": mdiArrowRight,
  "mdi-close": mdiClose,
  "mdi-menu": mdiMenu,
};
