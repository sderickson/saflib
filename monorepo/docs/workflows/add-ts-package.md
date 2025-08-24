# add-ts-package

## Source

[add-ts-package.ts](https://github.com/sderickson/saflib/blob/main/monorepo/workflows/add-ts-package.ts)

## Usage

```bash
npm exec saf-workflow kickoff add-ts-package <name> <path>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

* Copy template files and rename placeholders.
  * Upsert **index.ts** from [template](https://github.com/sderickson/saflib/blob/main/monorepo/workflows/templates/index.ts)
  * Upsert **package.json** from [template](https://github.com/sderickson/saflib/blob/main/monorepo/workflows/templates/package.json)
  * Upsert **test.ts** from [template](https://github.com/sderickson/saflib/blob/main/monorepo/workflows/templates/test.ts)
  * Upsert **vitest.config.js** from [template](https://github.com/sderickson/saflib/blob/main/monorepo/workflows/templates/vitest.config.js)
* Update package.json to remove TODOs
* Ensure the new package path 'packages/my-lib' is included in the "workspaces" array in '/Users/scotterickson/src/saf-2025/saflib/monorepo/package.json'. For example: "workspaces": ["packages/my-lib", "other-packages/*"]
* Run `npm install`
* A test file 'packages/my-lib/my-lib.test.ts' has been created. Verify it imports from './index.ts' and tests pass. Run 'npm run test --workspace="@example-org/example-package"'. You might need to 'cd packages/my-lib' then 'npm run test'.


## Help Docs

```bash
Usage: saf-workflow kickoff add-ts-package [options] <name> <path>

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
