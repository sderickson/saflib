# env/add-var

## Source

[add-env-var.ts](https://github.com/sderickson/saflib/blob/main/env/workflows/add-env-var.ts)

## Usage

```bash
npm exec saf-workflow kickoff env/add-var <name>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Copy template files and rename placeholders.
  - Upsert **env.schema.json** from [template](https://github.com/sderickson/saflib/blob/main/env/workflows/templates/env.schema.json)
- Add the environment variable 'EXAMPLE_ENV_VAR' to the env.schema.json file.
- Run `npm install @saflib/env`
- Run `npm exec saf-env generate`
- Run `npm exec saf-env generate-all`

## Help Docs

```bash
Usage: saf-workflow kickoff env/add-var [options] <name>

Add a new environment variable to the schema and generate the corresponding
TypeScript types

Arguments:
  name        The name of the environment variable (in all upper case, e.g.,
              'API_KEY' or 'DATABASE_URL')

Options:
  -h, --help  display help for command

```
