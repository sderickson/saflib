# Overview

The analytics suite records product events from clients and exposes them for admin review and testing.

Typical integration:

- Mount `@saflib/analytics-http` routes on your API service.
- Use `@saflib/analytics-sdk` in SPAs to record events.
- Add `@saflib/analytics-vue` pages to the admin SPA for browsing events.
- Use `@saflib/analytics-service` for server-side analytics in tests or services that do not use the HTTP buffer.

Most of this is only used in development or CI, in order to make it easy to browse product events or fetch them in a Playwright test. In production, you may integrate with a third-party analytics provider on the frontend directly, or use this suite to proxy these events through your own service by creating your own implementation of `@saflib/analytics-service`.

## Packages

| Package                                                                | Role                                | Docs                                                        |
| ---------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------- |
| [@saflib/analytics-spec](../analytics-spec/docs/ref/index.md)          | OpenAPI spec and shared types       | [Code reference](../analytics-spec/docs/ref/index.md)       |
| [@saflib/analytics-http](../analytics-http/docs/ref/index.md)          | In-memory buffer and Express routes | [Code reference](../analytics-http/docs/ref/index.md)       |
| [@saflib/analytics-sdk](../analytics-sdk/docs/ref/index.md)            | Client SDK and TanStack Query hooks | [Code reference](../analytics-sdk/docs/ref/index.md)        |
| [@saflib/analytics-vue](../analytics-vue/docs/ref/components/index.md) | Admin SPA pages                     | [Components](../analytics-vue/docs/ref/components/index.md) |
| [@saflib/analytics-service](../analytics-service/docs/ref/index.md)    | Server-side analytics abstraction   | [Code reference](../analytics-service/docs/ref/index.md)    |
