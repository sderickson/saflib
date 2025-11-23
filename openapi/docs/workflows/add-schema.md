# openapi/add-schema

## Source

[add-schema.ts](https://github.com/sderickson/saflib/blob/main/openapi/workflows/add-schema.ts)

## Usage

```bash
npm exec saf-workflow kickoff openapi/add-schema <name>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Copy template files and rename placeholders.
  - Upsert **example.yaml** from [template](https://github.com/sderickson/saflib/blob/main/openapi/workflows/templates/schemas/template-file.yaml)
  - Upsert **error.yaml** from [template](https://github.com/sderickson/saflib/blob/main/openapi/workflows/templates/schemas/error.yaml)
  - Upsert **openapi.yaml** from [template](https://github.com/sderickson/saflib/blob/main/openapi/workflows/templates/openapi.yaml)
  - Upsert **index.ts** from [template](https://github.com/sderickson/saflib/blob/main/openapi/workflows/templates/index.ts)
- Update **example** to define the schema for the example resource.
- Add the schema to the openapi.yaml file in the components.schemas section.
- Run `npm exec saf-specs generate`
- Update the index.ts file to export the new schema from `components["schemas"]`.
- Run `npx tsc --noEmit`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff openapi/add-schema <name>

Add a new schema to an existing OpenAPI specification package

Arguments:
  name        The name of the schema to create (e.g., 'user' or 'product')
              Example: "example"

```
