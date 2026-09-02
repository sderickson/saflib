# openapi/add-event

## Source

[add-event.ts](https://github.com/sderickson/saflib/blob/main/openapi/workflows/add-event.ts)

## Usage

```bash
npm exec saf-workflow kickoff openapi/add-event <path>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

Kicking off workflow openapi/add-event

- Upsert 5 templates.
- Update **example_event.yaml**. Resolve all TODOs.
- Run `npm run generate`
- Run `npx tsc --noEmit`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff openapi/add-event <path>

Add a new event to an existing OpenAPI specification package

Arguments:
  path        The path for the event (e.g., 'product_view' or 'cart_add')
              Example: "./events/example_event.yaml"

```
