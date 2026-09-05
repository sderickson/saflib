# Overview

`@saflib/links` provides utilities for defining links to pages independently of domain or protocol. Shared link definitions keep navigation URLs consistent across SPAs, tests, and server-side code, and help guard against broken links per [best practices](../../best-practices.md#specify-and-enforce-shared-apis-models-and-strings).

Links are added automatically by the workflow [vue/add-view](../../vue/docs/workflows/add-view.md).

## Link definitions

Links are defined without a domain or protocol, so they work in both test environments and production. These two URLs:

- `https://app.example.com/home?q=1`
- `http://app.docker.localhost/home?q=1`

... are both represented by the same `Link`:

```typescript
const link: Link = {
  subdomain: "app",
  path: "/home",
  params: ["q"],
};
```

Domain and protocol come from the browser on the frontend, or from the `DOMAIN` and `PROTOCOL` environment variables on the backend.

## Package structure and integration

See [base](https://github.com/sderickson/saflib/tree/main/base/clients/links). Each SPA has a `{subdomain}-links.ts` file with a typed `LinkMap` of its pages. The expected way to integrate these into your application is:

- Import link paths in the SPA router so routes and navigation stay aligned.
- Have other SPAs, Playwright tests, and server-side code (such as emails) import and use links rather than hard-coding the urls.
