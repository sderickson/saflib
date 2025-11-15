# email/add-template

## Source

[add-email-template.ts](https://github.com/sderickson/saflib/blob/main/email/email/workflows/add-email-template.ts)

## Usage

```bash
npm exec saf-workflow kickoff email/add-template <path>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Run `npm install @saflib/email`
- Copy template files and rename placeholders.
  - Upsert **example-email.ts** from [template](https://github.com/sderickson/saflib/blob/main/email/email/workflows/templates/emails/__target-name__.ts)
- Implement the email template.

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff email/add-template <path>

Add email template infrastructure and templates to a project.

Arguments:
  path        Path of the new email template (e.g. './email-templates/weekly-report.ts')
              Example: "./emails/example-email.ts"

```
