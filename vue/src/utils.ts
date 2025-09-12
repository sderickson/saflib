import { type Link, linkToHref } from "@saflib/links";

/**
 * Utility to get the current host, including the port, e.g. "localhost:3000".
 */
export const getHost = () => {
  let host = "localhost:3000";
  if (typeof document !== "undefined") {
    host = document.location.host.replace(getClientName(), "");
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

let clientName = "unknown";
/**
 * Call when the SPA starts, providing the name of the client. It should be the same as the subdomain, or "root" if it's the root domain.
 */
export const setClientName = (client: string) => {
  if (
    client !== "root" &&
    !document.location.hostname.startsWith(`${client}.`)
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
 */
export const linkToProps = (link: Link) => {
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
