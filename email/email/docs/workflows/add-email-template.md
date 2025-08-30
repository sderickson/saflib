# add-email-template

## Source

[add-email-template.ts](https://github.com/sderickson/saflib/blob/main/email/email/workflows/add-email-template.ts)

## Usage

```bash
npm exec saf-workflow kickoff add-email-template <path>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Run `npm install @saflib/email`
- Copy template files and rename placeholders.
  - Upsert **example-email.ts** from [template](https://github.com/sderickson/saflib/blob/main/email/email/workflows/email-template-template/template-file.ts)
- Update example-email.ts to remove TODOs

## Help Docs

```bash
Usage: saf-workflow kickoff add-email-template [options] <path>

Add email template infrastructure and templates to a project.

Arguments:
  path        Path of the new email template (e.g.
              './email-templates/weekly-report.ts')

Options:
  -h, --help  display help for command

```
