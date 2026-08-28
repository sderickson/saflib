/**
 * SVG paths for `mdi-*` strings used by `@saflib/dev-site-vue`.
 * Webfont CSS is unreliable in this live-dev SPA; use the SVG iconset instead.
 */
import {
  mdiApi,
  mdiChevronDown,
  mdiChevronRight,
  mdiCircleSmall,
  mdiConnection,
  mdiCube,
  mdiCubeOutline,
  mdiDatabaseOutline,
  mdiFileDocumentOutline,
  mdiFileOutline,
  mdiFolderOutline,
  mdiHome,
  mdiLibraryShelves,
  mdiPackageVariantClosed,
  mdiTable,
  mdiTestTube,
  mdiVuejs,
} from "@mdi/js";

export const mdiIconPaths: Record<string, string> = {
  "mdi-api": mdiApi,
  "mdi-chevron-down": mdiChevronDown,
  "mdi-chevron-right": mdiChevronRight,
  "mdi-circle-small": mdiCircleSmall,
  "mdi-connection": mdiConnection,
  "mdi-cube": mdiCube,
  "mdi-cube-outline": mdiCubeOutline,
  "mdi-database-outline": mdiDatabaseOutline,
  "mdi-file-document-outline": mdiFileDocumentOutline,
  "mdi-file-outline": mdiFileOutline,
  "mdi-folder-outline": mdiFolderOutline,
  "mdi-home": mdiHome,
  "mdi-library-shelves": mdiLibraryShelves,
  "mdi-package-variant-closed": mdiPackageVariantClosed,
  "mdi-table": mdiTable,
  "mdi-test-tube": mdiTestTube,
  "mdi-vuejs": mdiVuejs,
};
