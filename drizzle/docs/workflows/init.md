# drizzle/init

## Source

[init.ts](https://github.com/sderickson/saflib/blob/main/drizzle/workflows/init.ts)

## Usage

```bash
npm exec saf-workflow kickoff drizzle/init <name> <path>
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
  - Upsert **index.test.ts** from [template](https://github.com/sderickson/saflib/blob/main/drizzle/workflows/templates/index.test.ts)
- Change working directory to services/example-service/example-db
- Run `npm install`
- Run `npm run generate`
- Run `mkdir -p data`
- Run `touch data/.gitkeep`
- Run `npm test`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff drizzle/init <name> <path>

Create a Drizzle/SQLite database package

Arguments:
  name        The name of the database package to create (e.g., 'user-db' or 'analytics-db')
              Example: "@example-org/example-db"
  path        The path to the target directory for the database package (e.g., './services/example-db')
              Example: "./services/example-service/example-db"

```
