# add-queries

## Source

[add-queries.ts](https://github.com/sderickson/saflib/blob/main/drizzle/workflows/add-queries.ts)

## Usage

```bash
npm exec saf-workflow kickoff add-queries <path>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

* Copy template files and rename placeholders.
  * Upsert **example-query.test.ts** from [template](https://github.com/sderickson/saflib/blob/main/drizzle/workflows/query-template/template-file.test.ts)
  * Upsert **example-query.ts** from [template](https://github.com/sderickson/saflib/blob/main/drizzle/workflows/query-template/template-file.ts)
* Check if `/queries/example-table/index.ts` exists. If it doesn't exist, create it.
* Update `/queries/example-table/index.ts` to include the new query.
* Update the package's `index.ts` to export the query collection if it doesn't already.
* Add any new parameter or result types needed for `exampleQuery` to the main `types.ts` file.
* Add any error types the query will return to the main `errors.ts` file.
* Review the guidelines for implementing database queries. 
* Update example-query.ts to remove TODOs
* Review the guidelines for writing tests for database queries.
* Update example-query.test.ts to remove TODOs
* Run test, make sure it passes.


## Help Docs

```bash
Usage: saf-workflow kickoff add-queries [options] <path>

Add a new query to a database built off the drizzle-sqlite3 package.

Arguments:
  path        Path of the new query (e.g. 'queries/contacts/get-by-id')

Options:
  -h, --help  display help for command

```
