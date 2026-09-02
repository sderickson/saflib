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

Kicking off workflow drizzle/add-query

- Upsert 4 templates.
- Implement the new query following the documentation guidelines.
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
