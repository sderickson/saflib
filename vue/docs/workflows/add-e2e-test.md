# vue/add-e2e-test

## Source

[add-e2e-test.ts](../../workflows/add-e2e-test.ts)

## Usage

```bash
npm exec saf-workflow kickoff vue/add-e2e-test <path>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Upsert 1 template.
- Update **test-name.spec.ts** to implement the E2E test workflow:
- Run `npm run typecheck`
- Run `npm run test:e2e`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff vue/add-e2e-test <path>

Create a new E2E test in a SAF-powered Vue SPA, using a template and renaming
   placeholders.

Arguments:
  path        Path of the new e2e test (e.g., './e2e/test-name.spec.ts')
              Example: "./e2e/test-name.spec.ts"

```
