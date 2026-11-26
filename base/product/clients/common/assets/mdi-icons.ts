/**
 * Named MDI SVG paths used by base SPAs and static sites.
 * Keep `mdi-*` string props working with the SVG iconset (no webfont CSS).
 * When adding a new `mdi-…` icon in a template, add the matching `@mdi/js` import here.
 * Auth / identity UI icons come from `@saflib/ory-kratos-spa/mdi-icons`.
 */
import {
  mdiArrowRight,
  mdiChevronLeft,
  mdiClose,
  mdiMenu,
} from "@mdi/js";
import { kratosMdiIconPaths } from "@saflib/ory-kratos-spa/mdi-icons";
import { oryKratosVueMdiIconPaths } from "@saflib/ory-kratos-vue/mdi-icons";
import { opsVueMdiIconPaths } from "@saflib/ops-vue/mdi-icons";
import { jobsVueMdiIconPaths } from "@saflib/jobs-vue/mdi-icons";
import { cronVueMdiIconPaths } from "@saflib/cron-vue/mdi-icons";
import { vueMdiIconPaths } from "@saflib/vue/mdi-icons";
import { auditVueMdiIconPaths } from "@saflib/audit-vue/mdi-icons";

export const mdiIconPaths: Record<string, string> = {
  ...kratosMdiIconPaths,
  ...oryKratosVueMdiIconPaths,
  ...opsVueMdiIconPaths,
  ...jobsVueMdiIconPaths,
  ...cronVueMdiIconPaths,
  ...vueMdiIconPaths,
  ...auditVueMdiIconPaths,
  "mdi-arrow-right": mdiArrowRight,
  "mdi-chevron-left": mdiChevronLeft,
  "mdi-close": mdiClose,
  "mdi-menu": mdiMenu,
};
