# Overview

This library provides a set of shared logic, documentation, and workflows for using a combination of [drizzle](https://orm.drizzle.team/) and [better-sqlite3](https://www.npmjs.com/package/better-sqlite3) to include [SQLite](https://sqlite.org/index.html) instances in the app.

These docs explain how consumers of `@saflib/drizzle-sqlite3` should use this library within SAF applications.

## Package Structure

Each package which depends on `@saflib/drizzle-sqlite3` should have the following structure:

```
package-name/
├── data/
│   └── .gitkeep
├── drizzle.config.ts
├── errors.ts
├── index.ts
├── instances.ts
├── migrations/
├── package.json
├── queries/
│   └── <domain>/
│       ├── index.ts
│       ├── get-by-id.ts
│       ├── get-by-id.test.ts
│       └── ...
├── schema.ts
└── types.ts
```

## Files and Directories Explained

### `data/`

Where the SQLite files are stored. Follows [convention](../../conventions.md#container-volumes).

### `drizzle.config.ts`

Should export the result of `defineConfig` from `drizzle-kit` as default. At minimum this configuration should contain the following:

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: "./schema.ts",
  dialect: "sqlite",
});
```

See [Drizzle Kit configuration file](https://orm.drizzle.team/docs/drizzle-config-file) for more info.

### `errors.ts`

Normally, this file only contains:

- One subclass of `HandledDatabaseError`.
- Multiple subclasses of _that_ subclass.

This enumerates all the errors which this database will return, and provides a superclass which can be used for convenient typing and `instanceof` checking.

The main reason errors are stored in a file at the root rather than adjacent to where they're thrown, is mainly so it's easy to export them since consumers will need to reference them.

Errors _may_ define a constructor and custom values, however that is often not required.

See [Queries](./03-queries.md) for more information on error handling.

See also [example Identity DB Errors](https://github.com/sderickson/saflib/blob/f1864114bbd38b20996ea0dfe486767dff42d3b2/identity/identity-db/errors.ts)

### `index.ts`

The interface of the database package, and what will be received when importing the package with no subpath.

It should return a spread of the public interface provided by `instances.ts`, as well as the queries for each domain. It should also re-export `types.ts` and `errors.ts`.

```typescript
export type * from "./types.ts";
export * from "./errors.ts";

import { mainDbManager } from "./instances.ts";
import * as users from "./queries/users/index.ts";
import * as todos from "./queries/todos/index.ts";

export const mainDb = {
  ...mainDbManager.publicInterface(),
  users,
  todos,
};
```

See [instances.ts](https://github.com/sderickson/saflib/blob/main/drizzle-sqlite3/instances.ts) for details on the public interface but in a nutshell, consumers can "connect" to the file (or in-memory) db instance and receive a `DbKey` which they can pass to queries. This keeps queries simple (in that they don't need to be associated our bound to a specific instance) and prevents direct access to the database by consumers.

### `instances.ts`

The glue between the schema, config, and this library's logic. It will likely be exactly this:

```typescript
import { DbManager } from "@saflib/drizzle-sqlite3";
import * as schema from "./schema.ts";
import config from "./drizzle.config.ts";

export const mainDbManager = new DbManager(schema, config, import.meta.url);
```

The `DbManager` constructor needs the url of the current file to resolve the relative paths to the migration folder and the data folder.

### `migrations/`

Where Drizzle's migration files are stored. See [Migrations with Drizzle Kit](https://orm.drizzle.team/docs/kit-overview) for more information about migrations.

Drizzle also provides [this helpful guide](https://orm.drizzle.team/docs/migrations) on different database migration approaches. I have only done "Option 4" (apply during runtime) so far as that's the simplest (not necessarily the safest for preventing downtime) but there's nothing in this library preventing the others.

### `package.json`

Aside from including `"@saflib/drizzle-sqlite3": "*"` in the dependencies, you can include some `drizzle-kit` commands in package scripts. The most useful would be `"generate": "drizzle-kit generate"`, which will create migration files if the schema has changed. You can also use the kit through `npx` directly.

See [Migrations with Drizzle Kit](https://orm.drizzle.team/docs/kit-overview) for more info.

### `queries/`

The meat of the database package. Queries should be organized into sub-folders by domain, and each of those folders should include an `index.ts` file which exports all queries in that folder in a single bundle which `index.ts` will import.

### `schema.ts`

Where the Drizzle schema will live. See [Drizzle schema](https://orm.drizzle.team/docs/sql-schema-declaration) and "Manage Schema" topics on the Drizzle site for more info, and [the schema doc here](./02-schema.md) for SAF-specific recommendations.

I haven't organized my schema into multiple files yet but it should be fine to put them into a `schema` directory instead.

### `types.ts`

Like `errors.ts`, it's helpful to have public interface types in a central location where they can all be exported along with everything else.

By and large these are re-exports of Drizzle's `$inferInsert` or `$inferSelect`, or altered versions of those, usually with `Pick` or `Omit`. See for example [the Identity Database's types](https://github.com/sderickson/saflib/blob/e75a8597ae497ea8d422dab1a1e96f41792b85ba/identity/identity-db/types.ts).
