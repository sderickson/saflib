# monorepo/add-export

## Source

[add-export.ts](https://github.com/sderickson/saflib/blob/main/monorepo/workflows/add-export.ts)

## Usage

```bash
npm exec saf-workflow kickoff monorepo/add-export <name> <path>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Copy template files and rename placeholders.
  - Upsert **myFunction.ts** from [template](https://github.com/sderickson/saflib/blob/main/monorepo/workflows/templates/template-file.ts)
  - Upsert **myFunction.test.ts** from [template](https://github.com/sderickson/saflib/blob/main/monorepo/workflows/templates/template-file.test.ts)
- Update **myFunction.ts** to implement the myFunction export.
- Update **myFunction.test.ts** to test the myFunction functionality.
- Run `npm run test`
- Add the myFunction export to the package's index.ts file. Import and export the new functionality from /Users/scotterickson/src/saf-2025/saflib/src/utils/myFunction.ts.
- Run `npm exec saf-docs generate`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff monorepo/add-export <name> <path>

Add new exports (functions, classes, interfaces) to packages

Arguments:
  name        The name of the export to create (e.g., 'myFunction' or 'MyClass')
              Example: "myFunction"
  path        The relative path where the export should be added (e.g., 'src/utils' or 'src/components')
              Example: "src/utils"

```
