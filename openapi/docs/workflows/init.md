# openapi/init

## Source

[init.ts](https://github.com/sderickson/saflib/blob/main/openapi/workflows/init.ts)

## Usage

```bash
npm exec saf-workflow kickoff openapi/init <name>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Upsert 9 templates.
- Upsert 14 templates.
- Change working directory to dossier/spec
- Run `npm install`
- Run `npm run generate`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff openapi/init <name>

Scaffold an offshoot OpenAPI package and its sibling test factories package

Arguments:
  name        Kebab-case offshoot name (e.g. 'dossier'). Creates {product}/{name}/spec (and {name}/test). The offshoot spec stands alone; it may reference the product spec's schemas, never the reverse.
              Example: "dossier"

```
