# express/add-handler

## Source

[add-handler.ts](https://github.com/sderickson/saflib/blob/main/express/workflows/add-handler.ts)

## Usage

```bash
npm exec saf-workflow kickoff express/add-handler <path> [--upload] [--download]
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target HTTP package (e.g. `myproduct/service/http`)
2. Run this command
3. Follow the instructions until done

## Recommended workflow order

1. **`openapi/route`** — YAML route + `operationId`
2. **`saf-specs generate`** — `dist/operations/<operationId>` fragment
3. **`drizzle/*`** — if the handler needs new tables/queries
4. **`express/add-handler`** — handler, group router, slim test

`operationId` follows `openapi/route`: `camelCase(handlerFile) + PascalCase(group)` (e.g. `routes/todos/create` → `createTodos`).

## What gets generated

- Handler file (`handlers/<group>/<handler>.ts`)
- Group router (`handlers/<group>/index.ts`) with per-operation `createOperationScopedMiddleware`
- Slim route test (`handlers/<group>/<handler>.test.ts`) using `testing/slim-route-test.ts`
- Updates to `http.ts` `defaultRouterMounts()` workflow area

Route handler tests mount the **group router**, not `create…HttpApp()` with every product router. Full app mounts are for `index.test.ts` smoke tests and `*.integration.test.ts` only.

Products with extra middleware (e.g. org tenancy) use a **product** `register*Route` helper that wraps `createOperationScopedMiddleware` — not a generic SAF registration helper.

## Checklist

When run, the workflow will:

Kicking off workflow express/add-handler

- Change working directory to ../common (when `--upload`)
- Upsert handler, test, router index, and helpers templates
- Implement the route handler
- Update the generated test file (slim router harness)
- Run `npm run typecheck` and `npm run test`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff express/add-handler <path> [--upload] [--download]

Add a new route to an Express.js service.

Arguments:
  path        Path of the new handler (e.g. 'routes/todos/create')
              Example: "./handlers/example-subpath/example-handler.ts"
  upload      Include file upload handling (multipart); shunt file data to a container in the store (optional flag)
  download    Return binary response (e.g. stream/send file from store or generated content) (optional flag)

```
