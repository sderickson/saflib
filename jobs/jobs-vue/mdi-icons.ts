/**
 * MDI SVG paths used by `@saflib/jobs-vue` pages. Host clients merge this map
 * into their Vuetify SVG iconset.
 */
import { mdiCancel, mdiClose, mdiEye, mdiReplay } from "@mdi/js";

export const jobsVueMdiIconPaths: Record<string, string> = {
  "mdi-cancel": mdiCancel,
  "mdi-close": mdiClose,
  "mdi-eye": mdiEye,
  "mdi-replay": mdiReplay,
};
