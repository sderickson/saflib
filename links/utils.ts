import { type Link, type LinkOptions } from "./types.ts";
import { typedEnv } from "@saflib/env";

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
  return `${protocol}//${link.subdomain && link.subdomain !== "root" ? `${link.subdomain}.` : ""}${domain}${path}`;
};

/**
 * Utility to get the current host, including the port, e.g. "localhost:3000".
 */
export const getHost = () => {
  let host = "localhost:3000";
  if (
    typeof document !== "undefined" &&
    document.location.host.startsWith("localhost")
  ) {
    // just to ease local development - specifically running vite in sdk
    return document.location.host;
  }
  if (typeof document !== "undefined" && process.env.NODE_ENV !== "test") {
    if (!getClientName()) {
      throw new Error(
        "You must call setClientName with your subdomain before using getHost",
      );
    }
    const clientName = getClientName();
    host = document.location.host.replace(clientName, "");
    if (host.startsWith(".")) {
      host = host.slice(1);
    }
  }
  return host;
};

/**
 * Utility to get the current protocol the same way document.location.protocol does, e.g. "http:" or "https:".
 */
export const getProtocol = () => {
  let protocol = "http:";
  if (typeof document !== "undefined") {
    protocol = document.location.protocol;
  }
  return protocol;
};

let clientName = "";
/**
 * Call when the SPA starts, providing the name of the client. It should be the same as the subdomain, or "root" if it's the root domain.
 */
export const setClientName = (client: string) => {
  if (
    process.env.NODE_ENV !== "test" &&
    client !== "root" &&
    !document.location.hostname.startsWith(`${client}.`) &&
    process.env.NODE_ENV !== "test"
  ) {
    throw new Error(
      `Client name ${client} does not match hostname ${document.location.hostname}`,
    );
  }
  clientName = client;
};

/**
 * Getter for the client name.
 */
export const getClientName = () => {
  return clientName;
};

/**
 * Given a Link object, return props which will work with vuetify components such as v-list-item and b-btn.
 * What is returned is based on the current domain; if the link is to the same subdomain, this returns a "to" prop,
 * otherwise it returns an "href" prop. That way a link will use vue-router wherever possible, to avoid full page
 * reloads.
 *
 * The current domain is derived from the client name, which is also the subdomain.
 */
export const linkToProps = (link: Link) => {
  let currentSubdomain = getClientName();
  if (process.env.NODE_ENV === "test" && !currentSubdomain) {
    currentSubdomain = "test";
  }
  if (!currentSubdomain) {
    throw new Error(
      "You must call setClientName with your subdomain before using linkToProps",
    );
  }
  if (currentSubdomain === link.subdomain) {
    return {
      to: link.path,
    };
  }
  return {
    href: linkToHref(link, { domain: getHost() }),
  };
};

export const linkToHrefWithHost = (link: Link, options?: LinkOptions) => {
  return linkToHref(link, { domain: getHost(), ...options });
};

/**
 * Simple utility to do a full page redirect to a link.
 *
 * TODO: This should use vue-router instead of window.location.href where possible.
 */
export const navigateToLink = (link: Link, options?: LinkOptions) => {
  const href = linkToHref(link, {
    domain: getHost(),
    ...options,
  });
  window.location.href = href;
};
