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
  - Upsert **example-project.checklist.md** from [template](https://github.com/sderickson/saflib/blob/main/processes/workflows/templates/template-file.checklist.md)
- Run `npm exec saf-docs print`
- Get familiar with the SAF packages available to you above. For more information about any given package, run `npm exec saf-docs <package-name>`.
- You are writing a product/technical specification for example-project. Ask for an overview of the project if you haven't already gotten one, then given that description, fill the spec.md file which was just created.
- Discuss and iterate on the spec until it's approved.
- Review documentation: [writing-spec-project-checklists.md](https://github.com/sderickson/saflib/blob/main/processes/docs/writing-spec-project-checklists.md)
- Run `npm exec saf-workflow kickoff help`
- See the above list of available workflow commands. Please fill out the checklist.md file with these commands and arguments.

## Help Docs

```bash
Usage: saf-workflow kickoff processes/spec-project [options] <name>

Write a product/technical specification for a project.

Arguments:
  name        kebab-case name of project to use in folder and git branch names
              and alike

Options:
  -h, --help  display help for command

```
