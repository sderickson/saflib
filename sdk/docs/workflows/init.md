# sdk/init

## Source

[init.ts](https://github.com/sderickson/saflib/blob/main/sdk/workflows/init.ts)

## Usage

```bash
npm exec saf-workflow kickoff sdk/init <name>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Upsert 5 templates.
- Change working directory to dossier/sdk
- Run `npm install`
- Run `npm run typecheck`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff sdk/init <name>

Scaffold an offshoot SDK package

Arguments:
  name        Kebab-case offshoot name (e.g. 'dossier'). Creates {product}/{name}/sdk. SPAs depend on it directly; the product sdk never re-exports it.
              Example: "dossier"

```
