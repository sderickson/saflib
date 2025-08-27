# SDK Overview

SDK packages are basically shared frontend code for a service. They include:

- Tanstack Queries
- Mocks for them
- Event logging
- Common components and logic, particularly for shared API schemas

Because SPA packages and SDK packages often use the same tools, they both depend on `@saflib/vue`.

## Package Structure

Each package which depends on `@saflib/vue` should have the following structure:

```
{service-name}-sdk/
├── components/
│   ├── component-1/
│   │   ├── {ComponentOne}.test.ts
│   │   └── {ComponentOne}.vue
│   └── component-2/
│   │   ├── {ComponentTwo}.test.ts
│   │   └── {ComponentTwo}.vue
│   └── ...
├── requests/
│   └── {resource-1}/
│   │   ├── index.ts
│   │   ├── index.mocks.ts
│   │   ├── {operation-id-1}.test.ts
│   │   ├── {operation-id-1}.ts
│   │   ├── {operation-id-1}.mocks.ts
│   │   ├── {operation-id-2}.ts
│   │   ├── {operation-id-2}.mocks.ts
│   │   └── ...
│   ├── {resource-2}/
│   ├── ...
│   └── mock-store.ts
├── index.ts
├── mocks.ts
├── package.json
├── typed-mock.json
└── tsconfig.json
```

There may be more folders, such as for:

- `assets/`
- `clients/`
- `loaders/`
- `composables/`
- `constants/`

At minimum, the packages should provide Tanstack Query hooks and mocks for everything in the adjacent OpenAPI spec.

Because this package is essentially a package of frontend tools for a service, the package should be named `{service-name}-sdk`, and live and be owned with the other packages for the service.

## Files and Directories Explained

### `components/`

Components are shared components for the service. These should be organized similar to the `pages/` directory as described in [`@saflib/vue`](../../docs/01-overview.md#pages).

### `requests/`

Requests are the core of the SDK, and are implemented with [Tanstack Query](https://tanstack.com/query/latest/docs/framework/vue/overview). There should be one file per operation, the files should be named after the operation ID, and be organized by resource. See [TanStack Queries](../06-tanstack-queries.md) and [Testing Queries](../05-query-testing.md) for more information.

These are called "requests" to distinguish them from database queries, to include both Tanstack queries and mutations, and as shorthand for "HTTP [Requests](https://developer.mozilla.org/en-US/docs/Web/API/Request)".

Alongside all these files are mocks. Per [best-practices](../../../best-practices.md#build-and-maintain-fakes-stubs-and-adapters-for-service-boundaries), mocks should be defined and shared in a common package, rather than written and maintained for each test. See [Mocking Queries](../08-mocking-queries.md) for more information.

### `index.ts`

The index file for the SDK. This should export all requests, components, and other shared code used in production. Since these packages can be large and shared, it's important to export everything independently, rather than grouping them in an object and exporting that object.

### `mocks.ts`

Similarly to the `index.ts` file, this re-exports files from the `requests/` directory. However, these only export the mock files, so that they're only used in tests. This also allows the mock in-memory store to automatically refresh the data after each test.

### `typed-mock.json`

This file simply stores the result of a call to [`typedCreateHandler`](../ref/@saflib/vue/testing/functions/typedCreateHandler.md) with the mock store. It is used by each mock file to type the mock handlers.
