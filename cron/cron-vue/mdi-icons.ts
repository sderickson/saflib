/**
 * MDI SVG paths used by `@saflib/cron-vue` pages. Host clients merge this map
 * into their Vuetify SVG iconset.
 */
import { mdiPause, mdiPlay } from "@mdi/js";

export const cronVueMdiIconPaths: Record<string, string> = {
  "mdi-pause": mdiPause,
  "mdi-play": mdiPlay,
};
