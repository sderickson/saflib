import { typedEnv } from "@saflib/env";

/**
 * A link to a page on a website, independent of the domain or protocol.
 */
export type Link = {
  subdomain: string;
  path: string;
  params?: string[];
};

/**
 * A collection of links, keyed by a name.
 */
export type LinkMap = Record<string, Link>;

/**
 * Options for creating a fully-qualified url.
 */
export interface LinkOptions {
  params?: Record<string, string>;
  domain?: string;
}

/**
 * Given a Link object, return a fully-qualified url. Any provided params must
 * be specified in the Link object.
 */
export const linkToHref = (link: Link, options?: LinkOptions): string => {
  let domain = "";
  let protocol = "";
  if (globalThis.document) {
    if (!options?.domain) {
      throw new Error(
        "domain is required when using linkToHref in the browser",
      );
    }
    domain = options.domain;
    protocol = document.location.protocol;
  } else {
    domain = typedEnv.DOMAIN;
    protocol = typedEnv.PROTOCOL + ":";
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

/**
 * Simple utility to do a full page redirect to a link.
 *
 * TODO: This should use vue-router instead of window.location.href where possible.
 */
export const navigateToLink = (link: Link, options?: LinkOptions) => {
  const href = linkToHref(link, options);
  window.location.href = href;
};
