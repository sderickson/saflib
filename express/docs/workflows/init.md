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

Kicking off workflow express/init

- Upsert 6 templates.
- Change working directory to services/example
- Run `npm install`
- Run `npm test`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff express/init <name> <path>

Create an Express HTTP service package

Arguments:
  name        The name of the HTTP service package to create (e.g., 'user-http' or 'analytics-http')
              Example: "example-http"
  path        The path to the target directory for the HTTP service package (e.g., './services/example')
              Example: "./services/example"

```
