# Testing

Things to keep an eye out for when writing tests for the SQLite layer.

## Database Instantiation

When testing database queries, always use the package's exported database manager rather than creating database instances directly. This ensures you're testing the same code path that consumers of your package will use per [best practices](../../best-practices.md#have-thorough-test-coverage).

Reuse **one in-memory connection per test file** and reset row data between tests. Connecting in `beforeEach` re-runs migrations on every test and is much slower at scale.

It will look like this:

```typescript
import { __serviceName__DbManager } from "../../instances.ts";
import type { DbKey } from "@saflib/drizzle";

describe("such-and-such query", () => {
  let dbKey: DbKey;

  beforeAll(() => {
    dbKey = __serviceName__DbManager.connect();
  });

  afterAll(() => {
    __serviceName__DbManager.disconnect(dbKey);
  });

  beforeEach(() => {
    __serviceName__DbManager.clearAllTablesForTests(dbKey);
  });

  it("should do something", async () => {
    const { result } = await someQuery(dbKey);
    // ... assertions
  });
});
```

`clearAllTablesForTests` deletes application rows from every table while preserving schema and `__drizzle_migrations`. It only works when `NODE_ENV=test`.

If the package exports a `publicInterface()` wrapper (e.g. `mainDb`), the same hooks apply using `mainDb.connect()`, `mainDb.disconnect()`, and `mainDb.clearAllTablesForTests()`.

## No FK cascades

Every drizzle package should include a small test that calls
`assertNoFkCascades` from `@saflib/drizzle` against the package root. It fails
if any migration SQL uses `ON DELETE/UPDATE CASCADE` or any schema sets
`onDelete`/`onUpdate: "cascade"`. See [Schema](./02-schema.md).

## Coverage

Database queries should aim for 100% coverage. This includes error handling. For any error they return, there should be a known set of steps to reproduce that error, and those should be in a test. If there's no known way to cause a "handled" error to be returned, then that logic should be removed. This ensures that all database query logic is intentional.

When tests assert against OpenAPI/service model shapes (not just DB row inserts), prefer factories from product `*-test` packages (`@scope/<product>-test/factories/*`, offshoot `*-<offshoot>-test`) instead of hand-built empties.
