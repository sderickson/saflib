/** Where a person's pages live in this admin app; each returns a router path. */
export interface UserLinks {
  user?: (id: string) => string;
  auditLog?: (id: string) => string;
  serverLogs?: (id: string) => string;
}

let links: UserLinks = {};

/** Products call this once so UserRef hover cards can link to a person's pages. */
export function configureUserLinks(next: UserLinks) {
  links = next;
}

export function getUserLinks(): UserLinks {
  return links;
}
