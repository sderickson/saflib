# Requests

SDK packages usually mostly consist of TanStack wrappers around API requests. [Base](https://github.com/sderickson/saflib/tree/main/base/service/sdk/requests/__group-name__) defines the normal structure of both queries and mutations, refer to that for details.

## Typed client

Each product SDK has one client at `client.ts`, built with [`createSafClient`](./ref/@saflib/sdk/functions/createSafClient.md). This provides a typed fetch interface from the OpenAPI spec.

### Query key conventions

Keys mirror URL path segments, substituting path params with runtime values. That makes invalidation predictable — invalidating a prefix clears related queries.

```
GET /recipes              → ["recipes", "list"]
GET /recipes/:id          → ["recipes", recipeId]
GET /recipes/:id/notes    → ["recipes", recipeId, "notes"]
```

Do **not** insert verb segments or raw operationIds when the URL already identifies the resource (`["recipes", id]`, not `["recipes", "get", id]`).

For named action paths, use the action as the final segment:

```
GET /recipe-note-files/by-note-ids?noteIds=…
                          → ["recipe-note-files", "by-note-ids", noteIds]
```

Export a `*QueryKey()` helper or stable `*_QUERY_KEY` constant from each read. Mutations invalidate broadly or narrowly:

```ts
queryClient.invalidateQueries({ queryKey: ["recipes", recipeId, "notes"] });
queryClient.invalidateQueries({ queryKey: ["recipes", recipeId] });
```

Response shapes follow [OpenAPI API design](../openapi/docs/02-api-design.md) — flat objects keyed by resource name.
