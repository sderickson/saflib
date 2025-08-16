# Overview

This library provides a set of shared logic, documentation, libraries, and workflows for using [Express](https://expressjs.com/en/5x/api.html) in an app. This has mainly been developed on [Node](https://nodejs.org/en), but it's not explicitly dependent on that runtime.

## Package Structure

Each package which depends on `@saflib/express` should have the following structure:

```
{service-name}-http/
├── context.ts
├── http.ts
├── routes/
│   └── {feature-1}/
│   │   ├── index.ts
│   │   ├── get-all.test.ts
│   │   ├── get-all.ts
│   │   ├── get-by-id.test.ts
│   │   ├── get-by-id.ts
│   │   └── ...
│   ├── {feature-2}/
│   └── ...
├── package.json
```

## Files and Directories Explained

### `context.ts`

An http app will likely require service-specific data and behaviors, and the best way to do this in Node is [AsyncLocalStorage](https://nodejs.org/api/async_context.html#asynclocalstorageenterwithstore).

The `context.ts` file simply defines the interface for the storage and creates the `AsyncLocalStorage` instance. It can also export a convenience method for creating the context.

Context may include things such as:

- database keys
- grpc clients
- configuration
- callbacks

This context should only include properties specific to this service. For common Node context and loggers, use stores provided by @saflib/node.

Note: if there's context that can be shared between different subsystems, this file may be kept in a separate "common"

### `https.ts`

This exports either an express app, an express router, or both.

If it's a router, it should only include middleware that's specific to that router's logic, which is everything returned by [`createPreMiddleware`](https://github.com/sderickson/saflib/blob/e75a8597ae497ea8d422dab1a1e96f41792b85ba/express/src/middleware/composition.ts#L22). At time of writing, the only middlewares not included are metrics ones.

An Express Router should include the following:

- Create any required DB connections if not provided. They will tend to be provided in production or development, and created in testing.
- Construct the app context and provide it to routes.
- Use `createPreMiddleware` and include what is returned before the routes.
- Use `recommendedErrorHandlers` and include that after the routes.

An Express App will do the above and also:

- `app.set("trust proxy", 1);` and any other required settings.
- Use the metricsRouter and metricsMiddleware

Examples:

- [Cron Service](https://github.com/sderickson/saflib/blob/main/cron/cron-service/http.ts)
- [Identity Service](https://github.com/sderickson/saflib/blob/main/identity/identity-service/http.ts)

### `routes/`

The main source of the package. Routes should be organized into sub-folders by domain, and each of those folders should include an index.ts file which exports all queries in that folder in a single bundle which index.ts will import.

See [Routes](./02-routes.md) for more information.
