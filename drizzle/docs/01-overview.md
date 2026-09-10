# Overview

This library provides a set of shared logic, documentation, and workflows for using a combination of [drizzle](https://orm.drizzle.team/) and [better-sqlite3](https://www.npmjs.com/package/better-sqlite3) to include [SQLite](https://sqlite.org/index.html) instances in the app.

These docs explain how consumers of `@saflib/drizzle` should use this library within SAF applications.

## Package structure and integration

See [base](https://github.com/sderickson/saflib/tree/main/base/service/db). Database packages are mainly used by their adjacent http packages, though other service packages may do so as well. This is a pattern used throughout SAF in order to keep a strong separation of concerns; SQL queries and schemas on one side, HTTP contracts on the other.

## Why Drizzle

Drizzle was chosen as the interface for a few reasons:

- It interfaces with several database options, so if you'd prefer PostgreSQL or MySQL, it would be a fairly small change.
- Types are inferred from the schema, so they don't need to be created separately.

Another handy feature is the migration system. I typically run migrations "live" on startup but again, it wouldn't be too difficult to set up tooling for [other migration strategies](https://orm.drizzle.team/docs/migrations).
