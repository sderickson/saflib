# Overview

`@saflib/sdk` is the **platform library** for TanStack Query clients, MSW fakes, and shared Vue components tied to an OpenAPI contract. SPAs import the SDK for making calls to the service backend.

Layout and naming for service packages are in [monorepo — `service/`](../../monorepo/docs/01-overview.md#service). The golden product SDK is [`base/service/sdk`](https://github.com/sderickson/saflib/blob/main/base/service/sdk/).

Use [sdk/add-query](./workflows/add-query.md) and [sdk/add-mutation](./workflows//add-mutation.md) to create TanStack functions, and [sdk/add-component](./workflows/add-component.md) for standalone components.

## What this package provides

| Export                                                                                                                                          | Role                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`createSafClient`](./ref/@saflib/sdk/functions/createSafClient.md) / [`handleClientMethod`](./ref/@saflib/sdk/functions/handleClientMethod.md) | Typed [`openapi-fetch`](https://openapi-ts.dev/openapi-fetch/) client with CSRF, subdomain routing, and TanStack error typing                            |
| [`createTanstackQueryClient`](./ref/@saflib/sdk/functions/createTanstackQueryClient.md)                                                         | Default QueryClient (stale time, selective retries) for SPAs                                                                                             |
| [`useDownload`](./ref/@saflib/sdk/functions/useDownload.md)                                                                                     | Cookie-authenticated file downloads                                                                                                                      |
| [`createCredentialsEventSource`](./ref/@saflib/sdk/functions/createCredentialsEventSource.md)                                                   | Cookie-authenticated SSE (cross-subdomain)                                                                                                               |
| [`./testing`](./ref/@saflib/sdk/testing/index.md)                                                                                               | [`withVueQuery`](./ref/@saflib/sdk/testing/functions/withVueQuery.md), [`typedCreateHandler`](./ref/@saflib/sdk/testing/functions/typedCreateHandler.md) |
| [`./testing/mock`](./ref/testing/mock/functions/setupMockServer.md)                                                                             | Vitest + MSW `setupMockServer` helper                                                                                                                    |
| [`./components`](https://github.com/sderickson/saflib/tree/main/sdk/components)                                                                 | Cross-product shared components (e.g. [`AddressForm`](https://github.com/sderickson/saflib/blob/main/sdk/components/address-form/AddressForm.vue))       |
| [`./workflows`](./workflows/index.md)                                                                                                           | Scaffold and extend product SDK packages                                                                                                                 |

See also [Requests](./02-requests.md), [Testing](./03-testing.md), and [Fakes](./04-fakes.md).
