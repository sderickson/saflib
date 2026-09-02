# sdk/add-query

## Source

[add-query.ts](https://github.com/sderickson/saflib/blob/main/sdk/workflows/add-query.ts)

## Usage

```bash
npm exec saf-workflow kickoff sdk/add-query <path> <urlPath> <method>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

Kicking off workflow sdk/add-query

- Upsert 5 templates.
- Update **list.ts** to implement the API query.
- Update **list.fake.ts** to implement the fake handler for testing.
- Run `npm run typecheck`
- Run `npm run test`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff sdk/add-query <path> <urlPath> <method>

Add a new API query to the SDK

Arguments:
  path        The file path to the template file to be created (e.g., './requests/secrets/list.ts')
              Example: "./requests/secrets/list.ts"
  urlPath     The URL path for the API endpoint (e.g., '/secrets' or '/secrets/{id}')
              Example: "/example"
  method      The HTTP method in lowercase (e.g., 'get', 'post', 'put', 'delete')
              Example: "get"

```
