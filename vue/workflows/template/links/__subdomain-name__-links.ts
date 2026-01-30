import type { LinkMap } from "@saflib/links";

const subdomain = "__subdomain-name__";

console.log("TODO: Remove this log once __subdomainName__Links is being used by the routes", subdomain);

export const __subdomainName__Links: LinkMap = {
  // BEGIN WORKFLOW AREA page-links FOR vue/add-page
  __target_name__: {
    subdomain,
    path: "/__full-path__",
  },
  // END WORKFLOW AREA
};
