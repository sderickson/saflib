import { linkToProps } from "@saflib/links";
import { accountLinks } from "@saflib/base-links";

export type AccountHomeNavItemId =
  | "profile"
  | "email"
  | "password"
  | "mfa"
  | "sessions";

export type AccountHomeNavItemLinkProps = {
  to?: string;
  href?: string;
};

export type AccountHomeNavItem = {
  id: AccountHomeNavItemId;
  linkProps: AccountHomeNavItemLinkProps;
};

export function buildAccountHomeNavItems(): AccountHomeNavItem[] {
  return [
    {
      id: "profile",
      linkProps: linkToProps(accountLinks.profile),
    },
    {
      id: "email",
      linkProps: linkToProps(accountLinks.email),
    },
    {
      id: "password",
      linkProps: linkToProps(accountLinks.password),
    },
    {
      id: "mfa",
      linkProps: linkToProps(accountLinks.mfa),
    },
    {
      id: "sessions",
      linkProps: linkToProps(accountLinks.sessions),
    },
  ];
}

export function resolveAccountHomeNavActiveId(
  path: string,
  items: AccountHomeNavItem[],
): AccountHomeNavItemId | undefined {
  const nested = items
    .slice()
    .sort(
      (a, b) => (b.linkProps.to?.length ?? 0) - (a.linkProps.to?.length ?? 0),
    );
  const match = nested.find((item) => {
    const to = item.linkProps.to;
    return typeof to === "string" && (path === to || path.startsWith(`${to}/`));
  });
  return match?.id;
}
