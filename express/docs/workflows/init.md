# express/init

## Source

[init.ts](https://github.com/sderickson/saflib/blob/main/express/workflows/init.ts)

## Usage

```bash
npm exec saf-workflow kickoff express/init <name>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Upsert 6 templates.
- Upsert 7 templates.
- Add @saflib/analytics-http-dossier-http dependency to parent http
- Change working directory to dossier/http
- Run `npm install`
- Run `npm run typecheck`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff express/init <name>

Scaffold an offshoot Express http package and weave its barrel router into the
   parent http app

Arguments:
  name        Kebab-case offshoot name (e.g. 'dossier'). Creates {product}/{name}/http and mounts its router on the parent http package.
              Example: "dossier"

```
