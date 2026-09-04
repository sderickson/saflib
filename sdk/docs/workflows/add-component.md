# sdk/add-component

## Source

[add-component.ts](../../workflows/add-component.ts)

## Usage

```bash
npm exec saf-workflow kickoff sdk/add-component <path>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Upsert 4 templates.
- Update **ExampleTable.vue** to implement the component.
- Update **ExampleTable.test.ts** to test the component.
- Run `npm run test`
- Run `npm run typecheck`
- Run `npm run typecheck`
- Run `npm run test`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff sdk/add-component <path>

Create a new component in the SDK package

Arguments:
  path        Path of the new component (e.g., './displays/example-table' or './forms/user-form')
              Example: "./displays/example-table"
```
