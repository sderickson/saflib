# drizzle/update-schema

## Source

[update-schema.ts](https://github.com/sderickson/saflib/blob/main/drizzle/workflows/update-schema.ts)

## Usage

```bash
npm exec saf-workflow kickoff drizzle/update-schema <path>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Copy template files and rename placeholders.
  - Upsert **example.ts** from [template](https://github.com/sderickson/saflib/blob/main/drizzle/workflows/templates/schemas/__group-name__.ts)
  - Upsert **schema.ts** from [template](https://github.com/sderickson/saflib/blob/main/drizzle/workflows/templates/schema.ts)
- Update example.ts to add the new table, or modify it.
- Run `npm run typecheck`
- Check that everything in example.ts is exported in the root `./schema.ts` file.
- Run `npm run generate`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff drizzle/update-schema <path>

Update a drizzle/sqlite3 schema.

Arguments:
  path        The path to the schema file to update
              Example: "./schemas/example.ts"

```
