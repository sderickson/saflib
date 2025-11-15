# identity/init

## Source

[init.ts](https://github.com/sderickson/saflib/blob/main/identity/identity/workflows/init.ts)

## Usage

```bash
npm exec saf-workflow kickoff identity/init <name> <path>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Copy template files and rename placeholders.
  - Upsert **package.json** from [template](https://github.com/sderickson/saflib/blob/main/identity/identity/workflows/templates/package.json)
  - Upsert **callbacks.ts** from [template](https://github.com/sderickson/saflib/blob/main/identity/identity/workflows/templates/callbacks.ts)
  - Upsert **run.ts** from [template](https://github.com/sderickson/saflib/blob/main/identity/identity/workflows/templates/run.ts)
  - Upsert **env.schema.combined.json** from [template](https://github.com/sderickson/saflib/blob/main/identity/identity/workflows/templates/env.schema.combined.json)
  - Upsert **Dockerfile.template** from [template](https://github.com/sderickson/saflib/blob/main/identity/identity/workflows/templates/Dockerfile.template)
  - Upsert **index.ts** from [template](https://github.com/sderickson/saflib/blob/main/identity/identity/workflows/templates/index.ts)
  - Upsert **index.test.ts** from [template](https://github.com/sderickson/saflib/blob/main/identity/identity/workflows/templates/index.test.ts)
  - Upsert **vitest.config.js** from [template](https://github.com/sderickson/saflib/blob/main/identity/identity/workflows/templates/vitest.config.js)
- Change working directory to services/example-identity
- Run `npm exec saf-env generate`
- Run `npm install`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff identity/init <name> <path>

Create an identity service package

Arguments:
  name        The name of the identity service package to create (e.g., 'example-identity')
              Example: "example-identity"
  path        The path to the target directory for the identity service package (e.g., './services/example-identity')
              Example: "./services/example-identity"

```
