# Queries

Queries are the bulk of the public interface for the database package. Services should not craft their own SQL queries, they should be housed in the "queries" folder of the database library and exported for general use.

## Query Interfaces

All queries should use `queryWrapper` to catch and normalize unhandled errors. This way, the database layer never exposes errors emitted by SQLite. If it did, service layers may try to handle them directly and this would lead to tight coupling.

Each query file exports a queryWrapper'd function that takes a DbKey as its first parameter and returns the query result. Queries return errors using the [`ReturnsError<TResult, TError>`](../../utils/returns-error.ts) pattern per [best practice](../../best-practices.md#return-errors).

Queries may take an object as a parameter with options for the query. However, these should be added judiciously. A query with inconsistent behavior (such as only sometimes returning related data, or accepting different query parameters) will be harder to isolate performance and reliability issues. Prefer instead creating separate queries.

## Testing

Things to keep an eye out for when writing tests for queries

- Reuse one in-memory connection per test file and reset row data between tests, for performance. `clearAllTablesForTests` deletes application rows from every table while preserving schema and `__drizzle_migrations`.
- Database queries should aim for 100% coverage. This includes error handling. For any error they return, there should be a known set of steps to reproduce that error, and those should be in a test. If there's no known way to cause a "handled" error to be returned, then that logic should be removed. This ensures that all database query logic is intentional.
