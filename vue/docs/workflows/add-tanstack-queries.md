# add-tanstack-queries

## Source

[add-tanstack-queries.ts](https://github.com/sderickson/saflib/blob/main/vue/workflows/add-tanstack-queries.ts)

## Usage

```bash
npm exec saf-workflow kickoff add-tanstack-queries <path>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

* Read the project spec and the reference documentation for TanStack Query integration.
* Copy template files and rename placeholders.
  * Upsert **query-template.test.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/query-template/query-template.test.ts)
  * Upsert **query-template.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/query-template/query-template.ts)
* Read the testing guide: /saflib/vue/docs/05-query-testing.md
* Update feature.test.ts to remove TODOs
* Run test, make sure it passes.
* Update the package index.ts at /Users/scotterickson/src/saf-2025/saflib/vue/requests/index.ts to export the new queries file.


## Help Docs

```bash
Usage: saf-workflow kickoff add-tanstack-queries [options] <path>

Add TanStack Query integration to a SAF-powered Vue SPA.

Arguments:
  path        Path of the new queries file (e.g. 'requests/feature.ts')

Options:
  -h, --help  display help for command

```
