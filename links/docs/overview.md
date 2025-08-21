# Overview

`@saflib/links` is a simple utility package to provide a standard way to define links to pages, independently of where the page is deployed. This is useful for tests and guarding against broken links per [best practices](../../best-practices.md#specify-and-enforce-shared-apis-models-and-strings).

## Link Definitions

Links are defined without a domain or a protocol, so they work both in test environments and in production, such as these two links:

- `https://app.example.com/home?q=1`
- `http://app.docker.localhost/home?q=1`

Both would be defined by the same `Link` object defined as:

```typescript
const link: Link = {
  subdomain: "app",
  path: "/home",
  params: ["q"],
};
```

The links will draw the domain and the protocol either from the browser environment on the frontend, or the `DOMAIN` and `PROTOCOL` environment variables on the backend.

## Link Packages

Each SPA package should have a separate `links` package which is just a list of its pages. The SPA itself should depend on the links package and use it in the router to ensure they are the same.

Consumers of that package will include:

- Other pages in the SPA, or other SPAs, which direct users to those links.
- Unit and E2E tests which need to navigate to those links as part of the test, or check they've been navigated to.
- Server-side code which needs to create those links, such as for emails.

By having a separate package, these consumers don't need to depend on everything the SPA does, such as React, Vue, or Vite. These should use functions provided by `@saflib/links` with the `Link` objects.

The links package should be named the same as the SPA package, with `-links` appended. e.g. `@saflib/auth-links` for `@saflib/auth`.
