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
  - Upsert **example-query.ts** from [template](https://github.com/sderickson/saflib/blob/main/drizzle/workflows/templates/queries/example-table/template-file.ts)
  - Upsert **example-query.test.ts** from [template](https://github.com/sderickson/saflib/blob/main/drizzle/workflows/templates/queries/example-table/template-file.test.ts)
  - Upsert **index.ts** from [template](https://github.com/sderickson/saflib/blob/main/drizzle/workflows/templates/queries/example-table/index.ts)
- Check if `/queries/example-table/index.ts` exists. If it doesn't exist, create it.
- Update `/queries/example-table/index.ts` to include the new query.
- Update the package's `index.ts` to export the query collection if it doesn't already.
- Add any new parameter or result types needed for `exampleQuery` to the main `types.ts` file.
- Add any error types the query will return to the main `errors.ts` file.
- Review documentation: [03-queries.md](https://github.com/sderickson/saflib/blob/main/drizzle/docs/03-queries.md)
- Implement the `exampleQuery` query following the documentation guidelines.
- Review documentation: [04-testing.md](https://github.com/sderickson/saflib/blob/main/drizzle/docs/04-testing.md)
- Implement `example-query.test.ts`.
- Run **example-query.test.ts**, make sure it passes.
- Run `npm run typecheck`

## Help Docs

```bash
Usage: saf-workflow kickoff drizzle/add-query [options] <path>

Add a new query to a database built off the drizzle-sqlite3 package.

Arguments:
  path        Path of the new query (e.g. 'queries/contacts/get-by-id')

Options:
  -h, --help  display help for command

```
