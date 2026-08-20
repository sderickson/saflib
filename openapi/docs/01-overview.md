# Overview

SAF uses [OpenAPI](https://www.openapis.org/what-is-openapi) to define and generate shared schemas and APIs across frontend and backend. This includes:

- API routes
- Shared object schemas
- Product events

Packages using `@saflib/openapi` can generate:

- TypeScript types (`dist/openapi.d.ts` and per-operation/schema fragments)
- JSON schemas (`dist/openapi.json`) for runtime validation

HTML API docs are served by `@saflib/dev-site`, not by `saf-specs generate`.

Cross-package schema `$ref`s use a SAF `pkg:` convention resolved at generate time:

```yaml
schema:
  $ref: "pkg:@scope/product-offshoot-spec/openapi.yaml#/components/schemas/Widget"
```

Do not re-list offshoot schemas under a parent `components.schemas` just to make `$ref`s work — reference the offshoot package instead. Generated parent schema fragments re-export offshoot types so existing `…-spec/schemas/Name` imports keep the correct type identity.
For conventions on designing routes and schemas (URL structure, batch endpoints, binary responses, nullable fields, etc.), see [API Design](./02-api-design.md).

For OpenAPI operation tags used by middleware and the job queue (`site-admin-only`, `background`, …), see [Operation tags](./03-tags.md).

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
│   ├── {resource-1}/
│   │   ├── operation-id-1.yaml
│   │   ├── operation-id-2.yaml
│   │   └── ...
│   ├── {resource-2}/
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

`saf-specs generate` deletes the entire output directory before writing, so removed routes and schemas do not leave stale fragments in `dist/`.

From a spec package (with `@saflib/openapi` depended on and a `build` script), run:

```bash
npm run build
```

Or invoke the bin directly:

```bash
saf-specs generate
```

From outside the package (or in agent workflows), use `npm exec`:

```bash
npm exec saf-specs generate
```

(`--html` is deprecated and ignored; use `@saflib/dev-site` for docs.)

### `events/`

Product event definitions. These are the sorts of events you send to Google Analytics or similar services. The index file will `oneOf` all the events, to create a single event type for any code which accepts any specified event. Each object should have an `event` property which is any string in the `index.yaml` file, and a specific string for each defined event.

By defining events in a spec, they can be handled in the backend, frontend, or across them both (depending on your ingestion pipeline).

Depending on how many events you have, you may want to organize them into folders. Try to keep them in one package, though, so there's a comprehensive list of well-defined events for a service.

### `routes/`

API route definitions. There should be one file per route, with the file name being the operation ID. Group them by resource (which should be the first part of the path, per classic REST API design).

Routes should use `schemas/` for recurring business objects. Unless you're sure the route will never return more than one kind of object, the response should be an object whose values are a business object or an array of business objects. Responses should avoid getting any deeper than that.

The top-level property should be the same as the operationId, as this will help debugging errors which just print the schema path for the offending file.

See [API Design](./02-api-design.md) for conventions on URL structure, when to add batch or action endpoints, and how to handle binary responses.

### `schemas/`

Business object definitions. These are important to get right, as they are shared across much of the domain. Aside from being used by route handlers and tanstack queries, these objects are also expected to be passed around and used as types for parameters and responses. Consider these use cases when defining them.

Per [best-practices](../../best-practices.md#specify-and-enforce-shared-apis-models-and-strings), keep these objects flat. If they reference some other object, have the field be an identifier.

Schemas should be defined in a way that is easy to reuse across routes.

For nullable and optional fields, follow [API Design — Nullable fields](./02-api-design.md#nullable-fields-openapi-30). **Do not use `type: "null"`** or JSON Schema `oneOf` with a null branch — those are not valid in our OpenAPI 3.0 toolchain.

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
