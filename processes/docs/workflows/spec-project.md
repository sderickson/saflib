# processes/spec-project

## Source

[spec-project.ts](https://github.com/sderickson/saflib/blob/main/processes/workflows/spec-project.ts)

## Usage

```bash
npm exec saf-workflow kickoff processes/spec-project <name>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Copy template files and rename placeholders.
  - Upsert **example-project.spec.md** from [template](https://github.com/sderickson/saflib/blob/main/processes/workflows/templates/template-file.spec.md)
- Update **example-project.spec.md**.

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff processes/spec-project <name>

Write a product/technical specification for a project.

Arguments:
  name        kebab-case name of project to use in folder and git branch names and alike
              Example: "example-project"

```
