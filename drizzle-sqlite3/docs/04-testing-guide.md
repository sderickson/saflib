# Testing Guide

Things to keep an eye out for when writing tests for the SQLite layer.

## Database Instantiation

When testing database queries, always use the package's exported database manager rather than creating database instances directly. This ensures you're testing the same code path that consumers of your package will use.

### Correct Pattern

```typescript
import { mainDb } from "@your-package/dbs-main"; // Import the package
import type { DbKey } from "@saflib/drizzle-sqlite3";

describe("Your Query Tests", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = mainDb.connect(); // Use the package's manager
  });

  afterEach(() => {
    mainDb.disconnect(dbKey);
  });

  it("should do something", async () => {
    const { result } = await mainDb.yourQuery(dbKey, params);
    // ... assertions
  });
});
```

## SQLite Timestamp Granularity

SQLite stores timestamps with second-level granularity, which can cause issues when comparing timestamps that include milliseconds. This is particularly important when writing tests that involve timestamp comparisons.

So, when writing tests that involve timestamp comparisons, you should round the timestamps to seconds before creating them:

```typescript
const now = new Date();
now.setMilliseconds(0); // Round to seconds
const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // Add 15 minutes
```

## Using Fake Timers

Avoid relying on `setTimeout`, instead use fake timers.

```typescript
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";

describe("Timestamp tests", () => {
  // Use fake timers for this suite
  beforeAll(() => {
    vi.useFakeTimers();
  });

  // Restore real timers after the suite
  afterAll(() => {
    vi.useRealTimers();
  });

  it("should handle timestamp updates correctly", async () => {
    // ... perform initial action that sets a timestamp ...
    const initialResult = await someAction();

    // Advance time by more than a second
    vi.advanceTimersByTime(1100);

    // ... perform action that updates the timestamp ...
    const updatedResult = await updateAction();

    expect(updatedResult.updatedAt.getTime()).toBeGreaterThan(
      initialResult.updatedAt.getTime(),
    );
  });
});
```
