# openapi/schema

## Source

[add-schema.ts](https://github.com/sderickson/saflib/blob/main/openapi/workflows/add-schema.ts)

## Usage

```bash
npm exec saf-workflow kickoff openapi/schema <name>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Upsert 2 templates.
- Update **example**
- Run `npm run generate`
- Run `npx tsc --noEmit`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff openapi/schema <name>

Work on an OpenAPI schema

Arguments:
  name        The name of the schema (e.g., 'user' or 'product')
              Example: "example"

```
