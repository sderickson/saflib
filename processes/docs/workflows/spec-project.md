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

- Upsert 3 templates.
- Update **example-project.spec.md**.
- Check with the user that the spec is complete and correct.
- Update **example-project.plan.md**.
- Have the user review the plan and make sure it's good to go.
- Update **example-project.workflow.ts**.
- Run `npm exec saf-workflow dry-run /Users/scott/src/saf-2025/saflib/processes/notes/2026-09-04-example-project/example-project.workflow.ts`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff processes/spec-project <name>

Write a product/technical specification for a project.

Arguments:
  name        kebab-case name of project to use in folder and git branch names and alike
              Example: "example-project"

```
