# drizzle/init

## Source

[init.ts](https://github.com/sderickson/saflib/blob/main/drizzle/workflows/init.ts)

## Usage

```bash
npm exec saf-workflow kickoff drizzle/init <name>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Upsert 9 templates.
- Upsert 10 templates.
- Add @saflib/analytics-http-dossier-db dependency to parent db
- Change working directory to dossier/db
- Run `npm install`
- Run `npm run typecheck`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff drizzle/init <name>

Scaffold an offshoot db package and weave its schemas into the parent db (no
   second monolith)

Arguments:
  name        Kebab-case offshoot name (e.g. 'dossier'). Creates {product}/{name}/db and weaves into the parent db package.
              Example: "dossier"

```
