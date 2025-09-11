# express/init

## Source

[init.ts](https://github.com/sderickson/saflib/blob/main/express/workflows/init.ts)

## Usage

```bash
npm exec saf-workflow kickoff express/init <name> <path>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Review documentation: [01-overview.md](https://github.com/sderickson/saflib/blob/main/express/docs/01-overview.md)
- Copy template files and rename placeholders.
  - Upsert **http.ts** from [template](https://github.com/sderickson/saflib/blob/main/express/workflows/templates/http.ts)
  - Upsert **index.ts** from [template](https://github.com/sderickson/saflib/blob/main/express/workflows/templates/index.ts)
  - Upsert **package.json** from [template](https://github.com/sderickson/saflib/blob/main/express/workflows/templates/package.json)
  - Upsert **tsconfig.json** from [template](https://github.com/sderickson/saflib/blob/main/express/workflows/templates/tsconfig.json)
  - Upsert **vitest.config.js** from [template](https://github.com/sderickson/saflib/blob/main/express/workflows/templates/vitest.config.js)
  - Upsert **index.test.ts** from [template](https://github.com/sderickson/saflib/blob/main/express/workflows/templates/index.test.ts)
- Update **http.ts** to implement the HTTP server for example-http.
- Change working directory to /Users/scotterickson/src/saf-2025/saflib/express/services/example
- Run `npm install`
- Run `npm test`

## Help Docs

```bash
Usage: saf-workflow kickoff express/init [options] <name> <path>

Create a new HTTP service package following @saflib/express structure and
conventions

Arguments:
  name        The name of the HTTP service package to create (e.g., 'user-http'
              or 'analytics-http')
  path        The path to the target directory for the HTTP service package
              (e.g., './services/example')

Options:
  -h, --help  display help for command

```
