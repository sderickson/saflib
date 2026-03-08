# TanStack

This guide focuses on how to implement query and mutation functions for TanStack Query.

## Creating a Typed Client

All queries and mutations use an [`openapi-fetch`](https://openapi-ts.dev/openapi-fetch/) typed client created with [`createSafClient`](./ref/@saflib/sdk/functions/createSafClient.md). Each SDK should have one created at the root of the package that every query and mutation can access.

```ts
// <your-package>/client.ts
import type { paths } from "@your-org/your-service-spec";
import { createSafClient, TanstackError } from "@saflib/sdk";

export const client = createSafClient<paths>("your-service");
```

See [`@saflib/openapi`](../../openapi/docs/01-overview.md) for more information on generating types from an OpenAPI spec.

## Writing a Query

A query should be a function which returns a [QueryOptions](https://tanstack.com/query/v5/docs/framework/vue/guides/query-options) object. The function can take whatever parameters, such as `Ref` objects for query parameters, or options to include in the object.

The function should use [`handleClientMethod`](./ref/@saflib/sdk/functions/handleClientMethod.md) to make the request, wrapped around a call to the typed client.

```ts
import { client } from "../client.ts";

export const getResource = (resourceId: Ref<number>) => {
  return queryOptions({
    queryKey: ["your-resource", resourceId],
    queryFn: async () => {
      return handleClientMethod(
        client.GET("/your-resource/{id}", {
          params: { path: { id: resourceId.value } },
        }),
      );
    },
  });
};
```

Altogether this handles types so that the result of using the query is typed based on the OpenAPI spec passed to `createSafClient`.

### Query Key Conventions

Query keys should mirror the URL path segments, replacing path parameters with their runtime values. This makes cache invalidation predictable — invalidating a prefix wipes all related queries below it.

```
URL: GET /recipes              → queryKey: ["recipes", "list"]
URL: GET /recipes/:id          → queryKey: ["recipes", recipeId]
URL: GET /recipes/:id/notes    → queryKey: ["recipes", recipeId, "notes"]
URL: GET /recipes/:id/notes/:noteId/files
                               → queryKey: ["recipes", recipeId, "notes", noteId, "files"]
```

For non-CRUD action endpoints, use the action name as the final segment:

```
URL: GET /recipe-note-files/by-note-ids?noteIds=...
                               → queryKey: ["recipe-note-files", "by-note-ids", noteIds]
```

This convention means mutations can invalidate broadly or narrowly:

```ts
// Invalidate all note queries for a recipe
queryClient.invalidateQueries({ queryKey: ["recipes", recipeId, "notes"] });

// Invalidate everything related to a recipe
queryClient.invalidateQueries({ queryKey: ["recipes", recipeId] });
```

## Writing a Mutation

A mutation needs to be a composable, so writing one is a bit different.

```ts
import type { ApiRequest } from "@your-org/your-service-spec";
import { handleClientMethod } from "@saflib/sdk";

export function useCreateResource() {
  const queryClient = useQueryClient();

  const mutationFn = (body: ApiRequest["createResource"]) => {
    return handleClientMethod(client.POST("/your-resource", { body }));
  };

  return useMutation({
    mutationFn,
    onSuccess: (_data, _variables, _context) => {
      queryClient.invalidateQueries({ queryKey: ["your-resource"] });
    },
  });
}
```

This also handles types, though it does require you to provide the request body type to the mutation function. You should also `useQueryClient` to invalidate queries when the mutation is successful.
