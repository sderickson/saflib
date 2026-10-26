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
- Add @saflib/saflib-dossier-http dependency to the composition root
- Change working directory to dossier/http
- Run `npm install`
- Run `npm run typecheck`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff express/init <name>

Scaffold an offshoot Express http package and mount its barrel router in the
   composition root

Arguments:
  name        Kebab-case offshoot name (e.g. 'dossier'). Creates {product}/{name}/http and mounts its router in the composition root (service/monolith).
              Example: "dossier"

```
