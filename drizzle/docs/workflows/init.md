# drizzle/init

## Source

[init.ts](https://github.com/sderickson/saflib/blob/main/drizzle/workflows/init.ts)

## Usage

```bash
npm exec saf-workflow kickoff drizzle/init <name>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Copy template files and rename placeholders.
  - Upsert **package.json** from [template](https://github.com/sderickson/saflib/blob/main/drizzle/workflows/templates/package.json)
  - Upsert **drizzle.config.ts** from [template](https://github.com/sderickson/saflib/blob/main/drizzle/workflows/templates/drizzle.config.ts)
  - Upsert **schema.ts** from [template](https://github.com/sderickson/saflib/blob/main/drizzle/workflows/templates/schema.ts)
  - Upsert **instances.ts** from [template](https://github.com/sderickson/saflib/blob/main/drizzle/workflows/templates/instances.ts)
  - Upsert **errors.ts** from [template](https://github.com/sderickson/saflib/blob/main/drizzle/workflows/templates/errors.ts)
  - Upsert **types.ts** from [template](https://github.com/sderickson/saflib/blob/main/drizzle/workflows/templates/types.ts)
  - Upsert **index.ts** from [template](https://github.com/sderickson/saflib/blob/main/drizzle/workflows/templates/index.ts)
  - Upsert **tsconfig.json** from [template](https://github.com/sderickson/saflib/blob/main/drizzle/workflows/templates/tsconfig.json)
  - Upsert **vitest.config.js** from [template](https://github.com/sderickson/saflib/blob/main/drizzle/workflows/templates/vitest.config.js)
  - Upsert **.gitignore** from [template](https://github.com/sderickson/saflib/blob/main/drizzle/workflows/templates/.gitignore)
- Update **package.json** with the correct package name "@saflib/example-db" and any specific dependencies needed for this database package.
- Update **schema.ts** to define the database tables and types for the example-db database.
- Update **types.ts** to export the appropriate types for the example-db database, including any custom types derived from the schema.
- Update **errors.ts** to define the specific error classes for the example-db database.
- Update **index.ts** to properly export the database interface, types, and errors for the example-db database package.

## Help Docs

```bash
Usage: saf-workflow kickoff drizzle/init [options] <name>

Create a new database package following the @saflib/drizzle structure and
conventions

Arguments:
  name        The name of the database package to create (e.g., 'user-db' or
              'analytics-db')

Options:
  -h, --help  display help for command

```
