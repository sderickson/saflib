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

Kicking off workflow openapi/init

- Upsert 9 templates.
- Upsert 14 templates.
- Upsert 15 templates.
- Add @saflib/saflib-dossier-spec dependency to parent spec
- Change working directory to dossier/spec
- Run `npm install`
- Run `npm run generate`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff openapi/init <name>

Scaffold an offshoot OpenAPI package (and sibling test factories package) and
   weave path $refs into the parent spec

Arguments:
  name        Kebab-case offshoot name (e.g. 'dossier'). Creates {product}/{name}/spec and weaves path $refs into the parent openapi.yaml.
              Example: "dossier"

```
