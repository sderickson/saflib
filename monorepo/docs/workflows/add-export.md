# monorepo/add-export

## Source

[add-export.ts](https://github.com/sderickson/saflib/blob/main/monorepo/workflows/add-export.ts)

## Usage

```bash
npm exec saf-workflow kickoff monorepo/add-export <path>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Upsert 2 templates.
- Add glob export for ./lib/*
- Update **myFunction.ts** to implement the myFunction export.
- Update **myFunction.test.ts** to test the myFunction functionality.
- Run `npm run test`
- Run `npm exec saf-monorepo exports check --package @saflib/monorepo`
- Run `npm exec saf-docs generate`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff monorepo/add-export <path>

Add new exports (functions, classes, interfaces) to packages

Arguments:
  path        Path of the new export module (e.g., './lib/myFunction.ts' or './http/headers.ts')
              Example: "./lib/myFunction.ts"

```
