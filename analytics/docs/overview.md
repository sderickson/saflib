# Overview

The analytics suite records product events from clients and exposes them for admin review and testing.

Typical integration:

- Mount `@saflib/analytics-http` routes on your API service.
- Use `@saflib/analytics-sdk` in SPAs to record events.
- Add `@saflib/analytics-vue` pages to the admin SPA for browsing events.
- Use `@saflib/analytics-service` for server-side analytics in tests or services that do not use the HTTP buffer.

## Packages

See [packages](./packages.md) for links to each package in this suite.
