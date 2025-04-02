# Testing Gotchas

Things to keep an eye out for when writing tests for the SQLite layer.

## SQLite Timestamp Granularity

SQLite stores timestamps with second-level granularity, which can cause issues when comparing timestamps that include milliseconds. This is particularly important when writing tests that involve timestamp comparisons.

## The Issue

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

## Solution

When writing tests that involve timestamp comparisons, you should round the timestamps to seconds before creating them:

```typescript
const now = new Date();
now.setMilliseconds(0); // Round to seconds
const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // Add 15 minutes
```
