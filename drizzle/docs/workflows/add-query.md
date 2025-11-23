# drizzle/add-query

## Source

[add-query.ts](https://github.com/sderickson/saflib/blob/main/drizzle/workflows/add-query.ts)

## Usage

```bash
npm exec saf-workflow kickoff drizzle/add-query <path>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Copy template files and rename placeholders.
  - Upsert **example-query.ts** from [template](https://github.com/sderickson/saflib/blob/main/drizzle/workflows/templates/queries/__group-name__/__target-name__.ts)
  - Upsert **example-query.test.ts** from [template](https://github.com/sderickson/saflib/blob/main/drizzle/workflows/templates/queries/__group-name__/__target-name__.test.ts)
  - Upsert **index.ts** from [template](https://github.com/sderickson/saflib/blob/main/drizzle/workflows/templates/queries/__group-name__/index.ts)
  - Upsert **index.ts** from [template](https://github.com/sderickson/saflib/blob/main/drizzle/workflows/templates/index.ts)
  - Upsert **types.ts** from [template](https://github.com/sderickson/saflib/blob/main/drizzle/workflows/templates/types.ts)
  - Upsert **errors.ts** from [template](https://github.com/sderickson/saflib/blob/main/drizzle/workflows/templates/errors.ts)
- Add parameters and results to the root types.ts file and errors to the errors.ts files.
- Implement the new query following the documentation guidelines.
- Update the group index to include the new query.
- Run `npm run typecheck`
- Implement the generated test file.
- Run `npm run typecheck`
- Run `npm run test`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff drizzle/add-query <path>

Add a new query to a database built off the drizzle-sqlite3 package.

Arguments:
  path        Path of the new query (e.g. 'queries/contacts/get-by-id')
              Example: "./queries/example/example-query.ts"

```
