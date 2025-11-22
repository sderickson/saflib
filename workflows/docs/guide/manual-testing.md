# Manual testing

The first step after writing your workflow is to make sure it basically runs, without any automation. There are a few ways to do this, from simple to comprehensive.

## Produce a checklist

The CLI `checklist` sub-command runs the workflow in dry mode, skipping all prompting, copying, and commands. It's a good way to run as much of the workflow as possible in milliseconds, with as many safety checks as possible such as making sure documentation files exist and template variables are provided.

```bash
npm exec saf-workflow checklist ./path/to/workflow.ts
```

## Run scripts

The CLI `run-scripts` sub-command runs the workflow in script mode, skipping all prompting but doing everything else. This will run whatever commands there are and copy files around, so it's not a test without side-effects, but it's a good way to check your templates work the way you'd expect, the commands have the right arguments, and the templates [work as-is](./templates.md#templates-should-work-as-is).

```bash
npm exec saf-workflow run-scripts ./path/to/workflow.ts
```

## Do the work yourself

If you really want to test the entire workflow, you can run it as the agent yourself. Kickoff the workflow, follow the instructions, and make sure everything makes sense and is well communicated.

```bash
npm exec saf-workflow kickoff ./path/to/workflow.ts
````