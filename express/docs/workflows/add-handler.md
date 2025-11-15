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

- Copy template files and rename placeholders.
  - Upsert **example-handler.ts** from [template](https://github.com/sderickson/saflib/blob/main/express/workflows/templates/routes/__group-name__/__target-name__.ts)
  - Upsert **example-handler.test.ts** from [template](https://github.com/sderickson/saflib/blob/main/express/workflows/templates/routes/__group-name__/__target-name__.test.ts)
  - Upsert **index.ts** from [template](https://github.com/sderickson/saflib/blob/main/express/workflows/templates/routes/__group-name__/index.ts)
  - Upsert **http.ts** from [template](https://github.com/sderickson/saflib/blob/main/express/workflows/templates/http.ts)
  - Upsert **\_helpers.ts** from [template](https://github.com/sderickson/saflib/blob/main/express/workflows/templates/routes/__group-name__/_helpers.ts)
- Implement the example-handler route handler.
- Update the feature router to include the new route handler.
- Update the generated example-handler.test.ts file following the testing guide patterns.
- Run `npm run typecheck`
- Run `npm run test`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff express/add-handler <path>

Add a new route to an Express.js service.

Arguments:
  path        Path of the new handler (e.g. 'routes/todos/create')
              Example: "./routes/example-subpath/example-handler.ts"

```
