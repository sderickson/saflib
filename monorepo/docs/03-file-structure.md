# File Structure for Collections

To promote modularity, maintainability, and ease of testing, we follow a specific pattern for organizing collections of related code items, such as API route handlers or database queries for a specific resource.

## The Problem: Monolithic Files

Files containing numerous related but distinct functions or classes (e.g., a single `call-series-routes.ts` containing handlers for GET, POST, PUT, DELETE, etc.) can become large and unwieldy. This leads to:

- **Difficult Navigation:** Finding specific logic requires scrolling through potentially hundreds of lines.
- **Complex Code Reviews:** Diffs become large and harder to review thoroughly.
- **Increased Merge Conflicts:** Multiple developers working on different aspects of the same resource are more likely to conflict.
- **Testing Challenges:** Setting up tests for one specific handler might require mocking or dealing with unrelated code in the same file.

## The Solution: One Item Per File + Index

Instead of monolithic files, break down collections into individual files within a dedicated directory, and use an `index.ts` file to aggregate and export them.

**Pattern:**

1.  **Create a Directory:** For a collection of items related to a specific concept (e.g., API routes for `CallSeries`, database queries for `User`), create a dedicated directory (e.g., `routes/call-series/`, `queries/user/`).
2.  **One File Per Item:** Place the code for each distinct item (e.g., a single route handler, a specific database query function) into its own file within that directory (e.g., `get-by-id.ts`, `create.ts`, `update.ts`). Name the file clearly based on its responsibility.
3.  **Aggregate in `index.ts`:** Create an `index.ts` file within the directory. Import the items from their individual files and export them, often as a structured object or namespace, for consumers.

**Example: API Routes (`services/api/routes/call-series/`)**

```
routes/
└── call-series/
    ├── create.ts       # Handler for POST /call-series
    ├── delete.ts       # Handler for DELETE /call-series/:id
    ├── get-all.ts      # Handler for GET /call-series
    ├── get-by-id.ts    # Handler for GET /call-series/:id
    ├── index.ts        # Aggregates and exports handlers
    └── update.ts       # Handler for PUT /call-series/:id
    └── create.test.ts  # Tests for create.ts
    └── ...             # Other handlers and their tests
```

**`routes/call-series/index.ts` Example:**

```typescript
import { createHandler } from "./create.ts";
import { deleteHandler } from "./delete.ts";
import { getAllHandler } from "./get-all.ts";
import { getByIdHandler } from "./get-by-id.ts";
import { updateHandler } from "./update.ts";

// Export handlers, perhaps grouped
export const callSeriesHandlers = {
  create: createHandler,
  delete: deleteHandler,
  getAll: getAllHandler,
  getById: getByIdHandler,
  update: updateHandler,
};

// Or configure an Express router here
import { Router } from "express";
const router = Router();
router.post("/", createHandler);
router.get("/", getAllHandler);
router.get("/:id", getByIdHandler);
router.put("/:id", updateHandler);
router.delete("/:id", deleteHandler);
export default router;
```

**Example: Database Queries (`dbs/main/src/queries/call-series/`)**

```
queries/
└── call-series/
    ├── create.ts       # Function to create a call series
    ├── delete.ts       # Function to delete a call series
    ├── errors.ts       # Custom errors specific to call series queries
    ├── get.ts          # Function to get a call series by ID
    ├── index.ts        # Aggregates and exports query functions
    ├── list.ts         # Function to list call series
    ├── update.ts       # Function to update a call series
    └── create.test.ts  # Tests for create.ts
    └── ...             # Other query functions and their tests
```

**`queries/call-series/index.ts` Example:**

```typescript
import type { DbType } from "../types"; // Assuming DbType is defined
import { createCallSeriesCreateQuery } from "./create";
import { createCallSeriesDeleteQuery } from "./delete";
import { createCallSeriesGetQuery } from "./get";
import { createCallSeriesListQuery } from "./list";
import { createCallSeriesUpdateQuery } from "./update";

// Export a factory function that takes the DB instance
// and returns an object with all query functions for this domain.
export function createCallSeriesQueries(db: DbType) {
  return {
    create: createCallSeriesCreateQuery(db),
    delete: createCallSeriesDeleteQuery(db),
    get: createCallSeriesGetQuery(db),
    list: createCallSeriesListQuery(db),
    update: createCallSeriesUpdateQuery(db),
  };
}

// Also re-export errors
export * from "./errors";
```

## Benefits

- **Improved Readability:** Files are shorter and focused on a single responsibility.
- **Easier Navigation:** File names clearly indicate their content.
- **Simplified Reviews:** Changesets are smaller and more focused.
- **Reduced Conflicts:** Less chance of multiple developers editing the same lines.
- **Focused Testing:** Unit tests can target individual files easily.

Adopting this pattern leads to a more organized, maintainable, and scalable codebase.
