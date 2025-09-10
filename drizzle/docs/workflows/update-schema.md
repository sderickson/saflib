# drizzle/update-schema

## Source

[update-schema.ts](https://github.com/sderickson/saflib/blob/main/drizzle/workflows/update-schema.ts)

## Usage

```bash
npm exec saf-workflow kickoff drizzle/update-schema [options]
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Review documentation: [02-schema.md](https://github.com/sderickson/saflib/blob/main/drizzle/docs/02-schema.md)
- Find the right schema file in this folder and update it based on the spec.
- Run `npm run generate`
- If any new tables were created, make sure to add the inferred types to `./types.ts` so they're exported in `./index.ts`.

## Help Docs

```bash
Usage: saf-workflow kickoff drizzle/update-schema [options]

Update a drizzle/sqlite3 schema.

Options:
  -h, --help  display help for command

```
