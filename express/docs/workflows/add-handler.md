# express/add-handler

## Source

[add-handler.ts](https://github.com/sderickson/saflib/blob/main/express/workflows/add-handler.ts)

## Usage

```bash
npm exec saf-workflow kickoff express/add-handler <path>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Review documentation: [03-routes.md](https://github.com/sderickson/saflib/blob/main/express/docs/03-routes.md)
- Copy template files and rename placeholders.
  - Upsert **example-handler.ts** from [template](https://github.com/sderickson/saflib/blob/main/express/workflows/handler-template/template-file.ts)
  - Upsert **example-handler.test.ts** from [template](https://github.com/sderickson/saflib/blob/main/express/workflows/handler-template/template-file.test.ts)
- Check if the feature router exists at `/routes/example-subpath/index.ts`. If it doesn't exist, create it with the basic structure to export the new route handler.
- Update the feature router at `/routes/example-subpath/index.ts` to include the new route handler.
- Check if the HTTP app exists at `/http.ts` or `/app.ts`. If neither exists, create one to mount your routes.
- Update the HTTP app to include the feature router.
- Implement the exampleHandler route handler. Make sure to:
- Review documentation: [04-testing.md](https://github.com/sderickson/saflib/blob/main/express/docs/04-testing.md)
- Update the generated example-handler.test.ts file following the testing guide patterns. Make sure to implement proper test cases that cover both success and error scenarios.
- Run **example-handler.test.ts**, make sure it passes.

## Help Docs

```bash
Usage: saf-workflow kickoff express/add-handler [options] <path>

Add a new route to an Express.js service.

Arguments:
  path        Path of the new handler (e.g. 'routes/todos/create')

Options:
  -h, --help  display help for command

```
