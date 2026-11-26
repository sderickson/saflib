/**
 * MDI SVG paths used by `@saflib/ops-vue` pages. Host clients merge this map
 * into their Vuetify SVG iconset.
 */
import {
  mdiAlert,
  mdiCheckCircle,
  mdiCloseCircle,
  mdiHelpCircle,
  mdiMagnify,
  mdiPlay,
  mdiRefresh,
} from "@mdi/js";

export const opsVueMdiIconPaths: Record<string, string> = {
  "mdi-alert": mdiAlert,
  "mdi-check-circle": mdiCheckCircle,
  "mdi-close-circle": mdiCloseCircle,
  "mdi-help-circle": mdiHelpCircle,
  "mdi-magnify": mdiMagnify,
  "mdi-play": mdiPlay,
  "mdi-refresh": mdiRefresh,
};
