# drizzle/update-schema

## Source

[update-schema.ts](https://github.com/sderickson/saflib/blob/main/drizzle/workflows/update-schema.ts)

## Usage

```bash
npm exec saf-workflow kickoff drizzle/update-schema <path> [--file] [--ignorePlural]
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Upsert 2 templates.
- Update example.ts to add the new table, or modify it.
- Run `npm run typecheck`
- Run `npm run generate`
- Run `npm test -- no-fk-cascades`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff drizzle/update-schema <path> [--file] [--ignorePlural]

Update a drizzle/sqlite3 schema.

Arguments:
  path        The path to the schema file to update
              Example: "./schemas/example.ts"
  file        Include file metadata columns (blob_name, file_original_name, mimetype, size, etc.) (optional flag)
  ignorePluralIgnore the plural check for the schema name (optional flag)
              Example: "false"

```
