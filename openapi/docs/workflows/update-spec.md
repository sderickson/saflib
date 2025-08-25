# update-spec

## Source

[update-spec.ts](https://github.com/sderickson/saflib/blob/main/openapi/workflows/update-spec.ts)

## Usage

```bash
npm exec saf-workflow kickoff update-spec [options]
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

* Review the project spec, and the documentation for updating specs.
* Add common objects to `schemas/`, and routes to `routes/`. Then link them in the `openapi.yaml` file.
* Update the openapi.yaml file to include the new routes and schemas.
* Run `npm run generate`
* Update `index.ts` to export any new schemas that were added to the spec.


## Help Docs

```bash
Usage: saf-workflow kickoff update-spec [options]

Update the OpenAPI spec for the project.

Options:
  -h, --help  display help for command

```
