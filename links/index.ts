export type LinkProps = { href: string } | { to: string };

export type Link = {
  subdomain: string;
  path: string;
  params?: string[];
};

export type LinkMap = Record<string, Link>;

// Based on the current domain, and if we're on the same subdomain, return props
// which will work with vuetify components such as v-list-item and b-btn
export const linkToProps = (link: Link) => {
  // This works for {subdomain}.docker.localhost as well as prod domains
  const currentSubdomain = document.location.hostname
    .split(".")
    .slice(0, -2)
    .join(".");
  if (currentSubdomain === link.subdomain) {
    return {
      to: link.path,
    };
  }
  return {
    href: linkToHref(link),
  };
};

export interface LinkOptions {
  params?: Record<string, string>;
}

export const linkToHref = (link: Link, options?: LinkOptions): string => {
  let domain = "";
  let protocol = "";
  if (globalThis.document) {
    domain = document.location.hostname.split(".").slice(-2).join(".");
    protocol = document.location.protocol;
  } else {
    domain = process.env.DOMAIN || "docker.localhost";
    protocol = (process.env.PROTOCOL || "http") + ":";
  }

  let path = link.path;
  if (options?.params) {
    const linkParams = link.params ?? [];
    for (const [param, _value] of Object.entries(options.params)) {
      if (!linkParams.includes(param)) {
        throw new Error(`Param ${param} not found in link ${link.path}`);
      }
    }
    path = `${path}?${new URLSearchParams(options.params).toString()}`;
  }
  return `${protocol}//${link.subdomain ? `${link.subdomain}.` : ""}${domain}${path}`;
};

export const navigateToLink = (link: Link, options?: LinkOptions) => {
  const href = linkToHref(link, options);
  window.location.href = href;
};
