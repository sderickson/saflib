import type { LinkMap } from "@saflib/links";

const subdomain = "__subdomain-name__";

export const __subdomainName__Links: LinkMap = {
  home: {
    subdomain,
    path: "/",
  },
  // BEGIN WORKFLOW AREA page-links FOR vue/add-page
  __target_name__: {
    subdomain,
    path: "/__target-name__",
  },
  // END WORKFLOW AREA
};
