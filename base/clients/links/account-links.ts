import type { LinkMap } from "@saflib/links";

const subdomain = "account";

export const accountLinks: LinkMap = {
  // BEGIN WORKFLOW AREA page-links FOR vue/add-view
  /** Display name and marketing email preferences (product `user_config`). */
  profile: {
    subdomain,
    path: "/profile",
  },
  // END WORKFLOW AREA
};
