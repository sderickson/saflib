import type { LinkMap } from "@saflib/links";

const subdomain = "__subdomain-name__";

export const __subdomainName__Links: LinkMap = {
  home: {
    subdomain,
    path: "/",
  },
  // BEGIN WORKFLOW AREA page-links FOR vue/add-view
  __fullName__: {
    subdomain,
    path: "/__url-path__",
  },
  // END WORKFLOW AREA
};
