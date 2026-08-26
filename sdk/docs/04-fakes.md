# Fake Implementations

For SAF components, testing is [fairly focused on testing rendering](../../vue/docs/04-testing.md#testing-interactions). In order to test how a component renders, it often needs to be provided data, and also it's a good idea to make sure the component loads itself correctly. Given these requirements, it's important to have a way to run the components on a fake version of the backends it depends on, and the SDK package is the [appropriate place to do that](../../best-practices.md#ownership-of-mocks-fakes-shims).

Fakes are built with [Mock Service Worker](https://mswjs.io/) because this intercepts network requests and so doesn't need to depend on how SAF frontend components do networking. SAF provides a helper function for creating fake handlers which enforce typechecking based on the OpenAPI spec for the service: [`typedCreateHandler`](./ref/@saflib/sdk/testing/functions/typedCreateHandler.md).

**Important:** Query parameters and path parameters in fake handlers are always `string` or `string[]` — never boolean or number. Compare with string literals (e.g. `query.publicOnly === "true"`, not `=== true`).

SDK packages should export:

- Per-resource handler arrays from `requests/{resource}/index.fakes.ts` (import only the groups a test needs).
- Shared mock data and `resetMocks()` from `requests/{resource}/mocks.ts`.
- Scenario handler lists that can be prepended to the baseline handlers when needed.

Do **not** add a root `fakes.ts` that re-exports every group — that forces every importer to parse the entire fake graph.

This way tests which depend on the SDK can quickly test on some fake data, but also test scenarios such as a user whose email is verified or not verified.
