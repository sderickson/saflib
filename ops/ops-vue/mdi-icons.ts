/**
 * MDI SVG paths used by `@saflib/ops-vue` pages. Host clients merge this map
 * into their Vuetify SVG iconset.
 */
import {
  mdiAlert,
  mdiCheck,
  mdiCheckCircle,
  mdiChevronDown,
  mdiChevronLeft,
  mdiChevronRight,
  mdiChevronUp,
  mdiCloseCircle,
  mdiHelpCircle,
  mdiMagnify,
  mdiPlay,
  mdiRefresh,
  mdiRestore,
} from "@mdi/js";

export const opsVueMdiIconPaths: Record<string, string> = {
  "mdi-alert": mdiAlert,
  "mdi-check": mdiCheck,
  "mdi-check-circle": mdiCheckCircle,
  "mdi-chevron-down": mdiChevronDown,
  "mdi-chevron-left": mdiChevronLeft,
  "mdi-chevron-right": mdiChevronRight,
  "mdi-chevron-up": mdiChevronUp,
  "mdi-close-circle": mdiCloseCircle,
  "mdi-help-circle": mdiHelpCircle,
  "mdi-magnify": mdiMagnify,
  "mdi-play": mdiPlay,
  "mdi-refresh": mdiRefresh,
  "mdi-restore": mdiRestore,
};
