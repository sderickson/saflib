# monorepo/add-package

## Source

[add-ts-package.ts](https://github.com/sderickson/saflib/blob/main/monorepo/workflows/add-ts-package.ts)

## Usage

```bash
npm exec saf-workflow kickoff monorepo/add-package <name> <path>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Copy template files and rename placeholders.
  - Upsert **package.json** from [template](https://github.com/sderickson/saflib/blob/main/monorepo/workflows/templates/package.json)
  - Upsert **tsconfig.json** from [template](https://github.com/sderickson/saflib/blob/main/monorepo/workflows/templates/tsconfig.json)
  - Upsert **index.ts** from [template](https://github.com/sderickson/saflib/blob/main/monorepo/workflows/templates/index.ts)
  - Upsert **index.test.ts** from [template](https://github.com/sderickson/saflib/blob/main/monorepo/workflows/templates/index.test.ts)
  - Upsert **vitest.config.js** from [template](https://github.com/sderickson/saflib/blob/main/monorepo/workflows/templates/vitest.config.js)
- The file 'packages/my-lib/package.json' has been created. Please update the "description" field and any other fields as needed, such as dependencies on other SAF libraries.
- Ensure the new package path 'packages/my-lib' is included in the "workspaces" array in the root `package.json`.
- Run `npm install`
- Run **index.test.ts**, make sure it passes.

## Help Docs

```bash
Usage: saf-workflow kickoff monorepo/add-package [options] <name> <path>

Creates a new TypeScript package according to monorepo best practices.

Arguments:
  name        The desired package name, including scope (e.g.,
              @your-org/package-name)
  path        The RELATIVE path from monorepo root where the package directory
              (containing package.json) will be created (e.g., packages/my-lib
              or saflib/node)

Options:
  -h, --help  display help for command

```
