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
