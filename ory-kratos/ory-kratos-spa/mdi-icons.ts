/**
 * MDI SVG paths used by `@saflib/ory-kratos-spa` pages and flow UI.
 * Host clients that mount these routes should merge this map into their
 * Vuetify SVG iconset (see product `clients/common/assets/mdi-icons.ts`).
 */
import {
  mdiAccountOutline,
  mdiCheckDecagram,
  mdiChevronRight,
  mdiCloudKey,
  mdiEmailCheck,
  mdiEmailOutline,
  mdiEye,
  mdiEyeOff,
  mdiLockOutline,
  mdiMessageLockOutline,
  mdiShieldKeyOutline,
} from "@mdi/js";

export const kratosMdiIconPaths: Record<string, string> = {
  "mdi-account-outline": mdiAccountOutline,
  "mdi-check-decagram": mdiCheckDecagram,
  "mdi-chevron-right": mdiChevronRight,
  "mdi-cloud-key": mdiCloudKey,
  "mdi-email-check": mdiEmailCheck,
  "mdi-email-outline": mdiEmailOutline,
  "mdi-eye": mdiEye,
  "mdi-eye-off": mdiEyeOff,
  "mdi-lock-outline": mdiLockOutline,
  "mdi-message-lock-outline": mdiMessageLockOutline,
  "mdi-shield-key-outline": mdiShieldKeyOutline,
};
