# openapi/add-route

## Source

[add-route.ts](https://github.com/sderickson/saflib/blob/main/openapi/workflows/add-route.ts)

## Usage

```bash
npm exec saf-workflow kickoff openapi/add-route <path>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Copy template files and rename placeholders.
  - Upsert **example-route.yaml** from [template](https://github.com/sderickson/saflib/blob/main/openapi/workflows/templates/routes/template-file.yaml)
- Update **example-route.yaml**. Resolve all TODOs.
- Add the route to the openapi.yaml file in the paths section. Reference the route file using $ref.
- Run `npm exec saf-specs generate`
- Run `npx tsc --noEmit`

## Help Docs

```bash
Usage: saf-workflow kickoff openapi/add-route [options] <path>

Add a new route to an existing OpenAPI specification package

Arguments:
  path        The path for the route (e.g., 'users' or 'products')

Options:
  -h, --help  display help for command

```
