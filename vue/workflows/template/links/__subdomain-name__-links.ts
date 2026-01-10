import type { LinkMap } from "@saflib/links";

const subdomain = "__subdomain-name__";

export const __subdomainName__Links: LinkMap = {
  home: {
    subdomain,
    path: "/",
  },
  // BEGIN SORTED WORKFLOW AREA page-links FOR vue/add-page
  __target-name__: {
    subdomain,
    path: "/__target-name__",
  },
  // END WORKFLOW AREA
};
