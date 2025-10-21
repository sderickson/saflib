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
