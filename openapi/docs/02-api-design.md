# API Design

This document covers conventions for designing REST APIs in SAF projects. These conventions keep APIs predictable, keep implementations focused, and avoid frontend hacks (like unbounded parallel queries) when the real fix belongs in the API shape.

## One URL Per Action

Each URL path should map to **one implementation** with one clear purpose. Do not overload a single endpoint with query parameters that change its fundamental behavior.

For example, don't design `GET /recipe-note-files` to serve as a list endpoint, a search endpoint, _and_ a batch-by-id endpoint depending on which query parameters are present. These are different operations with different implementations, different performance profiles, and different response shapes — give them different URLs.

### Resource Actions

Standard CRUD follows familiar REST patterns:

```
GET    /recipes          → list
POST   /recipes          → create
GET    /recipes/:id      → get by ID
PUT    /recipes/:id      → update
DELETE /recipes/:id      → delete
```

When you need operations beyond basic CRUD, add **named action paths** under the resource namespace. Since resource IDs are opaque identifiers (UUIDs, numeric IDs, etc.), they never collide with action names in practice:

```
GET  /recipe-note-files/by-note-ids?noteIds=1,2,3   → batch fetch
GET  /recipes/search?q=pasta                          → search
POST /recipes/import                                  → bulk import
```

Each of these has a distinct implementation and a distinct response contract. Keeping them at separate URLs makes this explicit.

### Binary vs. JSON Responses

Any URL that ends with a resource ID (e.g. `/recipes/:id/files/:fileId`) should return a **JSON object** — the resource's metadata.

If the endpoint needs to serve non-JSON content (file bytes, images, PDFs, etc.), add a path suffix to distinguish it:

```
GET /recipes/:id/files/:fileId        → JSON metadata
GET /recipes/:id/files/:fileId/blob   → binary file content
```

This way clients always know what they're getting: a resource path returns JSON, and a sub-path like `/blob` returns the binary representation.

## Response Structure

API responses should be designed for easy mapping into the TanStack Query cache. Follow these conventions:

### Always Return Objects

Every JSON response should be a **top-level object**, never a bare array or scalar. This makes responses extensible — you can add related resources or metadata later without breaking the contract.

```yaml
# Good
listRecipes:
  recipes:
    - { id: "r1", title: "Pasta" }
    - { id: "r2", title: "Soup" }

# Bad — bare array, can't extend
listRecipes:
  - { id: "r1", title: "Pasta" }
  - { id: "r2", title: "Soup" }
```

Also never put a **single business object at the root** via a bare `$ref` (or `allOf: [$ref]`). That has the same extensibility problem as a bare array:

```yaml
# Bad — business object at the root
schema:
  $ref: "#/components/schemas/Recipe"

# Good — keyed envelope
schema:
  type: object
  required: [recipe]
  properties:
    recipe:
      $ref: "#/components/schemas/Recipe"
```

Spec packages enforce this with `assertNoRootResponseBodies` from `@saflib/openapi` (legacy offenders may be allowlisted until migrated).

### Key by Resource Name

Top-level response keys should be the **resource name** (matching the schema name). This makes it straightforward to map response data into TanStack's query cache — the key in the response corresponds to the resource the query is about.

```yaml
# Single resource
getRecipe:
  recipe: { id: "r1", title: "Pasta", ... }

# List
listRecipes:
  recipes: [{ id: "r1", ... }, { id: "r2", ... }]

# Batch (grouped by parent ID)
noteFilesByNoteIds:
  noteFilesByNoteId:
    n1: [{ id: "f1", fileOriginalName: "photo.jpg" }, ...]
    n2: [{ id: "f2", fileOriginalName: "doc.pdf" }, ...]
```

### Keep Resources Flat

Resources should reference each other **by ID**, not by nesting. If a menu contains recipes, the menu object has `recipeIds: string[]`, not `recipes: Recipe[]`. This avoids stale nested data and keeps each resource's cache entry authoritative.

When a page needs to display resolved data (e.g. recipe titles inside a menu), the frontend fetches and joins them — or the API provides a dedicated endpoint that returns the resolved view (as a distinct schema, not by deeply nesting core resources).

## Schema Layout: Inline Route Bodies, Named Business Objects

Keep named schemas under `components.schemas` (or your spec's equivalent) reserved for **business objects** — the nouns your product talks about, like `Recipe`, `Menu`, `FileResource`. Don't promote per-route request or response envelopes to named schemas.

### Define request and response bodies inline in the route

Bodies that exist only to serve one endpoint should live **in that endpoint's route definition**, not as separate `CreateRecipeRequest` / `UpdateMenuRequest` / `ListRecipesResponse` schemas. Reuse named **business-object** schemas inside those inline definitions:

```yaml
# Good — inline request/response, referencing the Recipe business object
createRecipe:
  requestBody:
    required: true
    content:
      application/json:
        schema:
          type: object
          properties:
            title: { type: string }
            menuId: { type: string }
          required: [title]
  responses:
    "201":
      content:
        application/json:
          schema:
            type: object
            properties:
              recipe:
                $ref: "#/components/schemas/Recipe"
            required: [recipe]
```

```yaml
# Bad — two named schemas whose sole job is to wrap one endpoint
components:
  schemas:
    CreateRecipeRequest: { ... }
    CreateRecipeResponse: { ... }
```

Why:

- **Named schemas become global vocabulary**. Every entry in `components.schemas` claims a name that now means something project-wide. Reserving that vocabulary for things the product actually reasons about (resources) keeps it meaningful.
- **Route-specific envelopes change with the route**. Inlining puts the shape next to the handler/tests that enforce it, so edits don't ripple through a registry of one-off schemas.
- **Response objects already tend to be thin wrappers** around a business object (`{ recipe: Recipe }`, `{ recipes: Recipe[] }`). Naming those wrappers is almost always noise.

A **named** schema is the right call when:

- It's a **business object** (a resource your app actually talks about — `Recipe`, `Menu`).
- It's a **cross-route envelope** that multiple endpoints genuinely share (e.g. a common `Error` shape). If only two routes use it, it's probably still inline per route.

A few specific patterns worth calling out:

- **Response envelope of `{ resourceName: BusinessObject }`**: inline, `$ref` the business object.
- **Per-route request body** with one or two fields: inline.
- **Arrays/maps keyed by parent id** (batch-endpoint responses): inline the envelope, `$ref` the child business object.

### Tolerate extra fields in requests to keep clients simple

When a request body's shape overlaps with a business object (e.g. `PUT /packet-form-data/{id}` updates a few fields of `PacketFormData`), allow clients to send the **full business object** even when the endpoint only reads a subset. Fields the endpoint doesn't act on should be **silently ignored**, not rejected.

This lets clients write straightforward code like:

```ts
await putPacketFormData(id, packetFormDataFromCache);
```

without having to manually project the object down to "only the fields the server actually writes." The server is still the authority on what gets persisted — it just doesn't make the client do bookkeeping to express that.

Apply the same reasoning to agent-owned columns that share a shape with human-owned ones (e.g. `summary` vs `agentSummary`): if a PUT endpoint only writes the human field, it should accept — and ignore — the agent field when sent.

Document the write-vs-ignore split in the route YAML's description so the intent is discoverable, but **don't** reject the request on the ignored fields.

## HTTP Status Codes

Use status codes consistently so clients can distinguish **syntax errors** (bad request shape), **semantic/validation errors** (invalid references or business rules), **auth**, and **not found**.

### 400 Bad Request

Use for **malformed or invalid request format**: missing required fields, wrong types, invalid values for enums or formats. The client sent something the server cannot parse or that fails schema validation.

In most cases, _you do not need to specify 400 responses in the OpenAPI spec_. Most of these originate from OpenAPI request validation; only specify 400 responses if the API implementation needs to also do request validation.

### 401 Unauthorized

Use when the request **lacks valid auth** or the auth token is missing/expired. The client needs to authenticate (or re-authenticate) before retrying.

### 403 Forbidden

Use when the client **is authenticated** but **not allowed** to perform this action on this resource (e.g. not a member of the collection, insufficient role). The resource may exist; the caller simply doesn’t have permission.

### 404 Not Found

Use when the **primary resource** identified by the URL (e.g. the recipe in `GET /recipes/:id`) does not exist. The request is valid and authorized, but the thing you’re asking for isn’t there.

### 422 Unprocessable Entity

Use when the request is **well-formed and authorized**, but **semantically invalid** because a **referenced resource doesn’t exist** or a business rule is violated. Typical cases:

- The client sends a `collectionId` (or other reference) in the body or query, and that collection (or entity) does not exist — return **422** with a code like `COLLECTION_NOT_FOUND`, not 403 or 404.
- A parent resource is referenced by ID and that parent doesn’t exist (e.g. creating a menu in a non-existent collection).

Use 422 (not 404) when the **target of the request** is valid (e.g. “create a recipe” or “list recipes”) but a **reference inside** the request is invalid. That keeps 404 reserved for “the resource in the URL doesn’t exist” and makes it clear to the client that the failure is a validation problem (fix the reference), not “you’re not allowed” (403) or “this URL is wrong” (404).

## Security: no PII in URL parameters

Path and query parameters MUST contain only opaque identifiers (UUIDs, shortIds, slugs that don’t reveal personal data) or non-PII literals (enums, flags, ISO dates). PII — emails, full names, phone numbers, free-form text — MUST travel in request bodies.

Why: URL-shaped data is logged in many places — reverse proxy access logs, browser history, error reports, and the project’s audit log. Audit retention is multi-year; you do not want PII to inherit that retention by accident.

If you find yourself wanting an email or name in a path, replace it with the resource’s id and accept the lookup cost.

## Batch Endpoints

When a child resource will be fetched for multiple parents at once on a single page, design a **batch-capable endpoint** rather than requiring the frontend to make N requests.

A common pattern: the frontend loads a recipe and its notes (two loader queries), then needs note-files for every note. Without a batch endpoint, the page must fire one request per note — that's unbounded, can't fit in a page loader, and doesn't parallelize well.

Instead, provide a batch endpoint:

```
GET /recipe-note-files/by-note-ids?noteIds=n1,n2,n3
```

This lets the frontend fetch all note-files in **one request** as part of the page loader, keeping the number of loader queries fixed and predictable.

### When to Add Batch Endpoints

Look for these during spec/planning:

- A page displays a **parent resource** and a **list of children**, where each child has its own sub-resources.
- The number of sub-resource fetches scales with data (e.g. one request per note, per version, per item in a list).
- The frontend would otherwise need `useQueries` with a dynamic, data-dependent array of queries.

In these cases, add a batch endpoint that accepts multiple parent IDs and returns all matching child resources. Group the response by parent ID for easy client-side mapping.

## Nullable fields (OpenAPI 3.0)

SAF specs use **OpenAPI 3.0**, not OpenAPI 3.1 / full JSON Schema. Agents often reach for JSON Schema patterns that look correct in isolation but **fail spec bundling, code generation, or request validation**. The most common mistake is representing “this field can be null” with `type: "null"`.

### Do not use `type: "null"`

OpenAPI 3.0 allows only these `type` values: `array`, `boolean`, `integer`, `number`, `object`, `string`. **`null` is not one of them.**

These patterns are **invalid** in SAF specs and must not be added:

```yaml
# Bad — "null" is not an OpenAPI 3.0 type
mailingAddress:
  type: "null"

# Bad — JSON Schema / OpenAPI 3.1 style; breaks express-openapi-validator
mailingAddress:
  oneOf:
    - type: "null"
    - $ref: "./flat-address.yaml"

# Bad — same problem with anyOf
value:
  anyOf:
    - type: "null"
    - type: string
```

Symptoms when this slips in:

- Route tests or the running service return **500** during startup or first request, with validator errors mentioning `type` / `enum` / `oneOf`.
- Clients sending JSON `null` get **400** with messages like `request/body/mailingAddress must be object` even when the YAML comment says the field is nullable.

### Use `nullable: true` instead

In OpenAPI 3.0, mark a field as nullable with **`nullable: true`** on a normal typed schema:

```yaml
# Good — scalar
email:
  type: string
  nullable: true
  maxLength: 38

# Good — object with a $ref (sibling type is required)
mailingAddress:
  type: object
  nullable: true
  description: Flat mailing address. Null clears the field.
  allOf:
    - $ref: "../../schemas/dossier/embeds/flat-address.yaml"
```

**Avoid** `nullable: true` with `allOf: [$ref: …]` and **no sibling `type`**. That also breaks `express-openapi-validator` (often as a **500** with `"nullable" cannot be used without "type"`). See [@saflib/express routes — OpenAPI nullable](../../express/docs/03-routes.md#openapi-nullable-and-express-openapi-validator).

### Omit properties instead of sending JSON `null` (clients)

Even when a request field is documented as `nullable: true`, **clients should usually omit the property** when they have no value, rather than sending `"field": null`.

Reason: `express-openapi-validator` can reject explicit `null` on nullable object schemas that use `allOf` + `$ref`, while still accepting the property when it is **omitted**. Prefer omission in SDKs and form builders unless the route contract explicitly requires sending `null` to clear a field on update.

Example:

```ts
// Good — partial create; server stores omitted fields as null
{ familyName: "Chen", givenName: "Wei" }

// Risky — may 400 on nullable object + $ref schemas
{ familyName: "Chen", givenName: "Wei", mailingAddress: null }
```

On **update** routes where “omitted clears to null”, omitting a blank nested object is often the intended way to clear it — same as sending null — without tripping validation.

### Quick reference

| Goal            | OpenAPI 3.0 (use this)                                             | Do not use                                    |
| --------------- | ------------------------------------------------------------------ | --------------------------------------------- |
| Optional string | `type: string`, `nullable: true`                                   | `oneOf: [{ type: "null" }, { type: string }]` |
| Optional object | `type: object`, `nullable: true`, `allOf: [$ref]`                  | `type: "null"` or `oneOf` with null branch    |
| Unset on create | Document “omitted → null”; client omits key                        | Client sends `null` unless verified           |
| Clear on update | Document “omitted → null” or accept explicit null after schema fix | Assume `null` always validates                |
