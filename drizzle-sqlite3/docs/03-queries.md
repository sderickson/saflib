# Queries

Queries are the bulk of the public interface for the database package. Services should not craft their own SQL queries, they should be housed in the "queries" folder of the database library and exported for general use.

In addition, all queries should use `queryWrapper` to catch and normalize unhandled errors. This way, the database layer never exposes errors emitted by SQLite. If it did, service layers may try to handle them directly and this would lead to tight coupling.

## File Organization

All queries should be organized by domain (table or logical group) within the `queries/` directory. Each specific query operation (get, list, create, update, delete) should reside in its own file per [best practice](../../best-practices.md#keep-files-small). An `index.ts` file within each domain directory aggregates the individual query files.

```
package/
├── queries/
│   ├── todos/
│   │   ├── index.ts
│   │   ├── get-by-id.ts
│   │   ├── get-by-id.test.ts
│   │   ├── create.ts
│   │   ├── create.test.ts
│   │   └── ...
│   └── users/
│       └── ...
```

## Query Interfaces

Each query file exports a queryWrapper'd function that takes a DbKey as its first parameter and returns the query result. Queries return errors using the [`ReturnsError<TResult, TError>`](https://github.com/sderickson/saflib/blob/e75a8597ae497ea8d422dab1a1e96f41792b85ba/monorepo/index.ts#L5) pattern per [best practice](../../best-practices.md#return-errors).

Queries may take an object as a parameter with options for the query. However, these should be added judiciously. A query with inconsistent behavior (such as only sometimes returning related data, or accepting different query parameters) will be harder to isolate performance and reliability issues. Prefer instead creating separate queries.

Example queries:

- [cron-db's get all job settings query](https://github.com/sderickson/saflib/blob/e75a8597ae497ea8d422dab1a1e96f41792b85ba/cron/cron-db/queries/job-settings/get-all.ts)
- [identity-db's get-by-email query](https://github.com/sderickson/saflib/blob/main/identity/identity-db/queries/users/get-by-email.ts)
