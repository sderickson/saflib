# openapi/init

## Source

[init.ts](https://github.com/sderickson/saflib/blob/main/openapi/workflows/init.ts)

## Usage

```bash
npm exec saf-workflow kickoff openapi/init <name> <path>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Review documentation: [01-overview.md](https://github.com/sderickson/saflib/blob/main/openapi/docs/01-overview.md)
- Copy template files and rename placeholders.
  - Upsert **openapi.yaml** from [template](https://github.com/sderickson/saflib/blob/main/openapi/workflows/templates/openapi.yaml)
  - Upsert **package.json** from [template](https://github.com/sderickson/saflib/blob/main/openapi/workflows/templates/package.json)
  - Upsert **index.ts** from [template](https://github.com/sderickson/saflib/blob/main/openapi/workflows/templates/index.ts)
  - Upsert **tsconfig.json** from [template](https://github.com/sderickson/saflib/blob/main/openapi/workflows/templates/tsconfig.json)
- Change working directory to specs/example
- Run `npm exec saf-specs generate`

## Help Docs

```bash
Usage: saf-workflow kickoff openapi/init [options] <name> <path>

Create a new API spec package following the @saflib/openapi structure and
conventions

Arguments:
  name        The name of the API spec package to create (e.g., 'user-spec' or
              'analytics-spec')
  path        The path to the target directory for the API spec package (e.g.,
              './specs/example')

Options:
  -h, --help  display help for command

```
