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

- Upsert 3 templates.
- Clear template export placeholders in my-product/lib/my-lib/package.json
- The file 'my-product/lib/my-lib/package.json' has been created. Please update the "description" field and any other fields as needed, such as dependencies on other SAF libraries.
- Ensure the new package path 'my-product/lib/my-lib' is included in the "workspaces" array in the root `package.json`.
- Change working directory to my-product/lib/my-lib
- Run `npm install`
- Change working directory to
- Run `npm exec saf-imports tsconfig generate -- --write`
- Change working directory to my-product/lib/my-lib
- Run `npm run typecheck`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff monorepo/add-package <name> <path>

Creates a new TypeScript package according to monorepo best practices.

Arguments:
  name        The desired package name, including scope (e.g., @your-org/package-name)
              Example: "@example-org/example-package"
  path        The RELATIVE path from monorepo root where the package directory (containing package.json) will be created (e.g., my-product/lib/my-lib or saflib/node)
              Example: "my-product/lib/my-lib"

```
