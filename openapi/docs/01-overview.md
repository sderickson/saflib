# Overview

SAF uses [OpenAPI](https://www.openapis.org/what-is-openapi) to define and generate shared schemas and APIs across frontend and backend. This includes:

- API routes
- Shared object schemas
- Product events

Packages using `@saflib/openapi` can generate:

- TypeScript types
- JSON schemas
- API docs

## Package Structure

```
{service-name}-spec/
├── dist/
│   ├── openapi.d.ts
│   ├── openapi.json
│   └── index.html
├── events/
│   ├── index.yaml
│   ├── event-1.yaml
│   ├── event-2.yaml
│   └── ...
├── routes/
│   ├── {feature-1}/
│   │   ├── operation-id-1.yaml
│   │   ├── operation-id-2.yaml
│   │   └── ...
│   ├── {feature-2}/
│   └── ...
├── schemas/
│   ├── business-model-1.yaml
│   ├── business-model-2.yaml
│   └── ...
├── openapi.yaml
├── package.json
└── index.ts
```

## Files and Directories Explained

### `dist/`

Generated files. These are checked into the repo, per [best-practices](../../best-practices.md#check-in-generated-files).

```bash
npm run saf-specs generate
```

To generate HTML docs as well, run

```bash
npm run saf-specs generate -- --html
```

### `events/`

Product event definitions. These are the sorts of events you send to Google Analytics or similar services. The index file will `oneOf` all the events, to create a single event type for any code which accepts any specified event. Each object should have an `event` property which is any string in the `index.yaml` file, and a specific string for each defined event.

By defining events in a spec, they can be handled in the backend, frontend, or across them both (depending on your ingestion pipeline).

Depending on how many events you have, you may want to organize them into folders. Try to keep them in one package, though, so there's a comprehensive list of well-defined events for a service.

### `routes/`

API route definitions. There should be one file per route, with the file name being the operation ID.

Routes should use `schemas/` for recurring business objects. Unless you're sure the route will never return more than one kind of object, the response should be an object whose values are a business object or an array of business objects. Responses should avoid getting any deeper than that.

The top-level property should be the same as the operationId, as this will help debugging errors which just print the schema path for the offending file.

### `schemas/`

Business object definitions. These are important to get right, as they are shared across much of the domain. Aside from being used by route handlers and tanstack queries, these objects are also expected to be passed around and used as types for parameters and responses. Consider these use cases when defining them.

Per [best-practices](../../best-practices.md#specify-and-enforce-shared-apis-models-and-strings), keep these objects flat. If they reference some other object, have the field be an identifier.

Schemas should be defined in a way that is easy to reuse across routes.

### `openapi.yaml`

The index file for the spec. The main properties it requires are:

- `openapi` and `info`: standard OpenAPI properties
- `paths`: links to `routes/` files
- `components`: links to each individual schema file, and the `events/` index file

Examples:

- [`@saflib/identity` openapi.yaml](https://github.com/sderickson/saflib/blob/main/identity/identity-spec/openapi.yaml)
- [`@saflib/cron` openapi.yaml](https://github.com/sderickson/saflib/blob/main/cron/cron-spec/openapi.yaml)

### `index.ts`

The main entrypoint for the package. It should export:

- `jsonSpec`: the spec imported as `import * as json from "./dist/openapi.json" with { type: "json" };`
- `paths`: the paths type as `import type { paths } from "./dist/openapi.d.ts";`
- Helper types for extracting request and response types by operationId.
- Each `schema` as its own type.

This provides everything the application needs to verify communications, enforce type safety, and easily access common business object types.

Examples:

- [`@saflib/identity` index file](https://github.com/sderickson/saflib/blob/main/identity/identity-spec/index.ts)
- [`@saflib/cron` index file](https://github.com/sderickson/saflib/blob/main/cron/cron-spec/index.ts)

## Using Generated Files

See other packages for how they are used:

- [`@saflib/express`](../../express/docs/03-routes.md#typing-the-interface)
- `@saflib/vue` - TODO
