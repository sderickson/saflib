# express/add-handler

## Source

[add-handler.ts](https://github.com/sderickson/saflib/blob/main/express/workflows/add-handler.ts)

## Usage

```bash
npm exec saf-workflow kickoff express/add-handler <path> [--upload] [--download]
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Change working directory to ../common
- Change working directory to
- Upsert 5 templates.
- Implement the example-handler route handler.
- Update the generated example-handler.test.ts file following the testing guide patterns.
- Run `npm run typecheck`
- Run `npm run test`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff express/add-handler <path> [--upload] [--download]

Add a route handler, group router, slim test, and routers.ts mount. Run
   openapi/route and saf-specs generate first.

Arguments:
  path        Path of the new handler (e.g. 'handlers/todos/create')
              Example: "./handlers/example-subpath/example-handler.ts"
  upload      Include file upload handling (multipart); shunt file data to a container in the store (optional flag)
  download    Return binary response (e.g. stream/send file from store or generated content) (optional flag)

```
