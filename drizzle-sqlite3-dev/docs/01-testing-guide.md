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

### Incorrect Pattern

```typescript
// ❌ Don't import from internal files
import { yourQuery } from "./queries/your-query.ts";
import { createTestDb } from "@saflib/drizzle-sqlite3";

// ❌ Don't create database instances directly
const db = createTestDb();
```

## SQLite Timestamp Granularity

SQLite stores timestamps with second-level granularity, which can cause issues when comparing timestamps that include milliseconds. This is particularly important when writing tests that involve timestamp comparisons.

### The Issue

When you create a Date object in JavaScript, it includes millisecond precision:

```typescript
const now = new Date(); // e.g., 2024-03-31T12:34:56.789Z
```

However, when this timestamp is stored in SQLite, the milliseconds are truncated:

```typescript
// In SQLite
2024-03-31T12:34:56.000Z // milliseconds are lost
```

This can cause test failures when comparing timestamps, especially in tests that expect exact matches.

### Solution

When writing tests that involve timestamp comparisons, you should round the timestamps to seconds before creating them:

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

This approach allows precise control over time progression within your tests without introducing actual delays.
