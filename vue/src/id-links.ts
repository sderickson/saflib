/** Somewhere an id can take you, e.g. "Server logs" → "/ops-logs?id=…". */
export interface IdLink {
  label: string;
  to: string;
}

/** Per ShortId prefix ("r" request, "j" job, ...), the pages an id links to. */
export type IdLinkProviders = Partial<Record<string, (id: string) => IdLink[]>>;

let providers: IdLinkProviders = {};

/**
 * Products call this once so ShortIds cross-link: hovering a request id can
 * offer its server logs, its jobs and its audit events, wherever it shows.
 */
export function configureIdLinks(next: IdLinkProviders) {
  providers = next;
}

export function idLinksFor(prefix: string | undefined, id: string): IdLink[] {
  if (!prefix) return [];
  return providers[prefix]?.(id) ?? [];
}
