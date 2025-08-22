# add-env-var

## Usage

```bash
npm exec saf-workflow kickoff add-env-var <name>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the package you want to run this workflow in
2. Run this command
3. Have it follow the tool's instructions until the workflow is complete

## Checklist

When run, the workflow will:

* Copy template files and rename placeholders.
  * Create env.schema.json from [template](https://github.com/sderickson/saflib/blob/main/env/workflows/add-env-vars/env.schema.json)
* Update env.schema.json to remove TODOs
* Run `npm install @saflib/env`
* Run `npm exec saf-env generate`
* Run `npm exec saf-env generate-all`


## Help Docs

```bash
Usage: saf-workflow kickoff add-env-var [options] <name>

Add a new environment variable to the schema and generate the corresponding
TypeScript types

Arguments:
  name        The name of the environment variable (in all upper case, e.g.,
              'API_KEY' or 'DATABASE_URL')

Options:
  -h, --help  display help for command

```
