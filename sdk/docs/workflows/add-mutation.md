# sdk/add-mutation

## Source

[add-mutation.ts](../../workflows/add-mutation.ts)

## Usage

```bash
npm exec saf-workflow kickoff sdk/add-mutation <path> <urlPath> <method> [--upload] [--download]
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Upsert 5 templates.
- Update **execute.ts** to implement the API mutation.
- Update **execute.fake.ts** to implement the fake handler for testing.
- Run `npm run typecheck`
- Run `npm run test`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff sdk/add-mutation <path> <urlPath> <method> [--upload] [--download]

Add a new API mutation to the SDK

Arguments:
  path        The file path to the template file to be created (e.g., './requests/scans/execute.ts')
              Example: "./requests/scans/execute.ts"
  urlPath     The URL path for the API endpoint (e.g., '/scans/{id}/execute')
              Example: "/example"
  method      The HTTP method in lowercase (e.g., 'post', 'put', 'delete')
              Example: "post"
  upload      Mutation sends a file via FormData (e.g. multipart upload) (optional flag)
  download    Mutation returns binary (e.g. blob/arrayBuffer from fetch) (optional flag)
```
