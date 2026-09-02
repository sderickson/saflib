[**@saflib/drizzle**](../../index.md)

---

# Interface: DbOptions

When a "connection" is created, these parameters are provided.

## Properties

### onDisk?

> `optional` **onDisk**: `string` \| `boolean`

By default, the database will be created in memory. If onDisk is true, the
database will be created on disk, in a "data" folder, with the name of the
current environment. If onDisk is a string, the database will be created at
the given (absolute) path.

---

### overrideTestDefault?

> `optional` **overrideTestDefault**: `boolean`

During tests, onDisk is ignored and the database will be created in memory.
If you need to override this behavior, set this to true.

---

### pragmas?

> `optional` **pragmas**: `Record`\<`string`, `string` \| `number`\>

Optional SQLite pragmas applied immediately after the database connection
is opened, before migrations run. Values are stringified and passed to
`sqlite.pragma(\`${key} = ${value}\`)`.

Example: `{ journal_mode: "WAL", synchronous: "FULL" }`.

---

### readonly?

> `optional` **readonly**: `boolean`

Open the SQLite file with `SQLITE_OPEN_READONLY` (better-sqlite3
`readonly: true`, `fileMustExist: true`). Implies [skipMigrations](#skipmigrations).
In-memory DBs cannot be readonly.

---

### skipMigrations?

> `optional` **skipMigrations**: `boolean`

If true, skip running drizzle migrations on connect/attach. Use for
read-only or verify-only opens of an existing on-disk SQLite file (e.g.
verifying a sealed audit-log snapshot, opening an archived file for
forensics) where mutating the file's `__drizzle_migrations` table before
read would change the bytes we're about to verify.
