# Schema

When defining Drizzle schemas, please follow these more-specific guidelines.

## Data Types

- **JSON Data**: Use `text` with `{ mode: "json" }` for JSON data

  ```typescript
  preferences: text("preferences", { mode: "json" }).$type<string[]>(),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  ```

- **Timestamps**: Use `integer` with `{ mode: "timestamp" }` for dates

  ```typescript
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ```

- **Currency**: Use `integer` for monetary values (store in cents or other lowest denomination)
  ```typescript
  price: integer("price").notNull(),
  ```

## Relationships

- **One-to-One Relationships**: Add unique constraints
  ```typescript
  profileId: integer("profile_id").notNull().unique(),
  ```

## Indexes

- Use the array syntax within the table definition to define indexes.

  ```typescript
  import {
    integer,
    text,
    index,
    uniqueIndex,
    sqliteTable,
  } from "drizzle-orm/sqlite-core";

  export const user = sqliteTable(
    "user",
    {
      id: text("id").primaryKey({ autoIncrement: true }),
      name: text("name"),
      email: text("email"),
    },
    (table) => [
      index("name_idx").on(table.name),
      uniqueIndex("email_idx").on(table.email),
    ],
  );
  ```

## After Making Schema Changes

After making any changes to schema files:

1. Run `npm run generate` from the database package root
2. This will create a new migration file in the `migrations` directory
3. No schema-specific tests are needed - testing is done at the query level

Note: Schema changes should be committed along with their generated migration files.

## Planning a Schema Change

Normalization forms are a means, not the goal. The practical goal is that every
fact has exactly one authoritative home, and that the queries you actually run
can reach it through an index. These questions catch most of the mistakes that
are cheap now and expensive after there is production data.

### Where does this fact live, and who owns it?

- **One authoritative home per fact.** If the same column exists on two tables
  (a parent and its child), write down which one wins. Copies that drift are
  worse than a join.
- **Denormalize deliberately, not incidentally.** A cached/derived column is
  fine when you note what recomputes it. A copy that exists because it was
  convenient at the call site is a future inconsistency.

### Will this column ever be a lookup key?

- **Never store a lookup key inside a JSON column.** `json_each(...)` in a
  `WHERE` clause cannot use an index; it is a full table scan that grows with
  total rows, not with the rows you want. If you will ever ask "which rows
  contain X", it is a join table, not a JSON array.
- **JSON is for opaque payloads** — agent output, request snapshots, blobs you
  read whole and write whole. The moment you filter, sort, or aggregate on
  something inside JSON, promote it to a column.
- **Read-modify-write on a JSON column must be inside a transaction**, or
  concurrent writers silently lose each other's changes.

### One column, one meaning

- **No sentinel values in ID columns.** A column that holds "an id, or the
  literal `"none"`, or null" has three meanings and no possible foreign key.
  Use a separate nullable boolean/enum for the "explicitly none" state.
- **Mutually exclusive columns need a check constraint or a single
  discriminator column**, not a comment saying they are exclusive. Invariants
  enforced only in application code are invariants that will be violated.
- **Prefer an enum column over a free-text column** whose valid values live in a
  developer's head.

### Foreign keys only work if they are turned on

SQLite defaults `foreign_keys` to **OFF**. A `.references()` in Drizzle emits a
`FOREIGN KEY` clause in the migration, but that clause does nothing unless the
connection enables the pragma:

```ts
const pragmas = {
  journal_mode: "WAL", // readers don't block writers
  synchronous: "FULL", // durability
  foreign_keys: "ON", // make .references() actually enforce
  busy_timeout: 5000, // wait for locks instead of throwing SQLITE_BUSY
} as const;

const dbKey = myDbManager.connect({ onDisk: true, pragmas });
```

Decide the delete behavior too. `ON DELETE no action` (the Drizzle default)
means you must delete children yourself, in the right order, in a transaction.
If a parent delete should remove its children, say so explicitly.

### Retention and deletion

- For any table holding personal data, decide up front how a row gets deleted
  and whether anything must survive the delete (audit rows, billing records).
- Deletion is a schema concern: without enforced FKs and cascades, "delete this
  user's data" becomes a hand-maintained list of tables that goes stale.

### Money and counters

- **Money is `integer` in the smallest unit** (cents). Never `real` — repeated
  float addition accumulates error you cannot reconcile.
- **A running total is not an audit trail.** If a counter is ever reset (monthly
  usage, quotas), append an immutable ledger row per event and derive the total.
  Once the counter is zeroed, an unreconstructable bill is a support problem you
  cannot answer.

### Indexes follow queries

- Add the index when you add the query, and match column order to the query:
  equality columns first, then the range/sort column.
- A composite index `(a, b)` also serves lookups on `a` alone, so a separate
  index on `a` is redundant.
- Partial indexes (`.where(...)`) express "unique among active rows" cleanly —
  see `org_invitation` (unique pending invite per email) for the pattern.

### Consistency across tables

Mechanical consistency is what lets a reader (or an agent) predict a table they
have not opened yet. Within a product, keep uniform:

- timestamp representation (`integer` `{ mode: "timestamp" }` everywhere — not
  ISO strings in some tables and epoch integers in others),
- ID generation (one helper, not `generateShortId` in some tables and
  `randomUUID` in others),
- TS field naming (pick `camelCase` or `snake_case` per product and do not mix
  the two *within* a table),
- whether a given relationship is declared with `.references()`.

### Nullable-for-legacy columns

`notNull` is the default you should want; every nullable column is a branch in
every consumer. When a column is nullable only because old rows predate it, note
the backfill plan in the doc comment. Otherwise "null for legacy rows" quietly
becomes permanent, and readers can never tell whether null is meaningful.
