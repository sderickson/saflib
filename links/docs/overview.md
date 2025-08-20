# Overview

`@saflib/links` is a simple utility package to provide a standard way to define links to pages, independently of where the page is deployed. This is useful for tests and guarding against broken links per [best practices](../../best-practices.md#specify-and-enforce-shared-apis-models-and-strings)

For any given SPA, it should have a separate `links` package which contains links for each page in the SPA. The SPA itself should depend on the links package and use it in the router.

The consumers of the links package includes:

- Other pages in the SPA, or other SPAs, which direct users to those links.
- Unit and E2E tests which need to navigate to those links as part of the test, or check they've been navigated to.
- Server-side code which needs to create those links, such as for emails.

Links are defined without a domain or a protocol, so they work both in test environments and in production, such as https://app.example.com/home?q=1 or http://app.docker.localhost/home?q=1; both would be defined by the same `Link` object defined as:

```typescript
const link = {
  subdomain: "app",
  path: "/home",
  params: ["q"],
};
```
