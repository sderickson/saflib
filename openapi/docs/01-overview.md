# Overview

SAF uses [OpenAPI](https://www.openapis.org/what-is-openapi) to define and generate shared schemas and APIs across frontend and backend. This includes:

- API routes
- Business objects
- Product events

Packages using `@saflib/openapi` can generate:

- TypeScript types (`dist/openapi.d.ts` and per-operation/schema fragments)
- JSON schemas (`dist/openapi.json`) for runtime validation


Use [product/init](../../product/docs/workflows/init.md) to copy `base` into a new product. Use [openapi/init](./workflows/init.md) to scaffold an offshoot spec (+ sibling `*-test` package). Use [openapi/add-route](./workflows/add-route.md), [add-schema](./workflows/add-schema.md), and [add-event](./workflows/add-event.md) to extend an existing spec.

## The `pkg:` Extension

SAF extends OpenAPI to support linking schemas across NPM packages. This way an API spec can be split by domain and product/platform without relying on brittle relative paths.

Cross-package schema `$ref`s can use a SAF `pkg:` convention resolved at generate time:

```yaml
schema:
  $ref: "pkg:@scope/product-offshoot-spec/openapi.yaml#/components/schemas/Widget"
```

The most common use of this is the shared error object which lives in `@saflib/openapi`.

```yaml
schema:
  $ref: "pkg:@saflib/openapi/schemas/error.yaml"
```

## Package structure

Where a spec package lives in the product tree — `{product}/service/spec`, offshoot slices, and how `http` / `sdk` depend on it — is described in [monorepo service layout](../../monorepo/docs/01-overview.md#service). The golden reference implementation is [`saflib/base`](../../base/docs/01-overview.md):

| Location | Package | Role |
| -------- | ------- | ---- |
| [`base/service/spec`](../../base/service/spec/) | `@saflib/base-spec` | Product API contract |
| [`base/service/test`](../../base/service/test/) | `@saflib/base-test` | Shared schema factories for tests |
| [`base/__offshoot-name__/spec`](../../base/__offshoot-name__/spec/) | (offshoot spec) | Bounded feature slice; paths woven into the parent `openapi.yaml` |
