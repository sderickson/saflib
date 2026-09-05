# openapi/route

## Source

[add-route.ts](https://github.com/sderickson/saflib/blob/main/openapi/workflows/add-route.ts)

## Usage

```bash
npm exec saf-workflow kickoff openapi/route <path> <urlPath> <method> [--upload] [--download]
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Upsert 2 templates.
- Update **example.yaml**.
- Merge duplicate path keys for GET /example
- Run `npm run generate`
- Run `npm test -- no-root-response-bodies`
- Run `npx tsc --noEmit`
- ## Audit map (when this route matters)

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff openapi/route <path> <urlPath> <method> [--upload] [--download]

Work on an OpenAPI route

Arguments:
  path        The file path for the route (e.g., './routes/recipes/list.yaml')
              Example: "./routes/example/example.yaml"
  urlPath     The URL path for the route (e.g., '/recipes' or '/recipes/{id}')
              Example: "/example"
  method      The HTTP method (e.g., 'get', 'post', 'put', 'delete')
              Example: "get"
  upload      Include file upload (e.g. multipart) in the route (optional flag)
  download    Route returns binary (e.g. application/octet-stream or specific type) (optional flag)

```
