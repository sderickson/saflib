# Overview

`saflib-workflows` provides a framework for defining and running developer workflows in TypeScript projects, particularly with coding tools such as Cursor, Claude Code, or any similar agentic coding tool.

The purpose of `saflib-workflows` is to make code generation more reliable for routine work. You can define a series of steps which the agent will follow, with checks along the way to make sure the work is done according to what is correct for your project or stack.

For more information on the why, see [this doc](https://docs.saf-demo.online/workflows.html).

## Command Line Interface

The workflow interface is a command line tool; this works well with agents which can run arbitrary commands so they can automatically continue the workflow. A workflow can also then be "run" by a person to test it, or to understand the process and better review another's work.

To start a workflow, the agent will run a command like this:

```bash
npm exec saf-workflow kickoff <workflow-name> <workflow-arguments>
```

The CLI tool will run through the steps until a step prints out a prompt. Then it will print instructions to continue the workflow and exit. By telling an agent to run a command, they will then automatically go through the steps, doing their own work when prompted.

See a demo [here](https://www.youtube.com/watch?v=p6jfG5JH7_8).

### Setup

You will need a dedicated executable file which imports all the workflow definitions from other packages or locations in your repository, and passes them to the [provided CLI function](https://docs.saf-demo.online/workflows/docs/ref/functions/runWorkflowCli.html). See for example this repository's [saflib-workflows-cli package](https://github.com/sderickson/saflib/tree/main/workflows-cli).

To bootstrap workflows:

1. Run `npm install saflib-workflows` or similar.
2. Add `"bin": { "saf-workflow": "./workflow-cli.ts" }` to your `package.json`.
3. Add the `workflow-cli.ts` file:

```ts
#!/usr/bin/env node --experimental-strip-types --disable-warning=ExperimentalWarning

import metaWorkflows from "saflib-workflows/workflows";
import { runWorkflowCli } from "saflib-workflows";

runWorkflowCli([
  // workflows/add-workflow HOOK - do not remove this line
  ...metaWorkflows,
]);
```

You may also need to install [`@types/node`](https://www.npmjs.com/package/@types/node) if you haven't already; the generated workflow files need it for the typing to work.

Example setup in [this repo](https://github.com/sderickson/test-workflows-package).

## Adding Workflows

Once the CLI is set up, you can tell your preferred agent to navigate to the package you want to add a workflow to (assuming you're using npm workspaces) and run `npm exec saf-workflow workflows/add-workflow <name>`. For the best experience, provide it with, or direct it how to produce, the core elements: **steps**, **documents**, and **templates**.

### Steps

The core part of a workflow is a series of steps to complete a task. The steps include:

- **Copying** template files with some simple string replacement
- **Updating** those files-from-templates based on the current task
- **Running Checks** like automated tests or static analysis tools
- **Running Scripts** such as installing dependencies or generating code (deterministically)
- **Prompting** the agent or person

### Documents

Documents provided by the workflow are the source of truth on what the workflow should generate. The workflow itself should not contain documentation; it should focus on directing and orchestrating the agent or person, and only refer to the documentation as part of the process.

Ideally, these documents should live in the same package or module as the workflow, because workflows depend on documentation.

### Templates

These represent the preferred way to structure whatever thing is being created or updated as part of the workflow. You're much more likely to have a reliable result if the agent (or developer!) doesn't have to start from scratch.

The "copy" step in workflows will replace all instances of the string `template-file` with the provided name (usually passed from the CLI), as well as other variants of the string: templateFile, template_file, and TemplateFile.

## Example Workflows

This repository has [several workflows](https://github.com/search?q=repo%3Asderickson%2Fsaflib+%22%3D+defineWorkflow%3C%22&type=code) in it as examples. They're continuously updated as I develop the library and how to use it. This repository also is a monorepo, and is how I recommend grouping workflows with documentation.

You can also see the [template file](https://github.com/sderickson/saflib/blob/main/workflows/workflows/add-workflow.templates/template-file.ts) for the "add-workflow" workflow.

## Generating Checklists

The workflow CLI tool includes a `checklist` command which will dry-run the workflow and print out a checklist of the steps the workflow takes. This can be used in documentation, such as the [generated checklist for adding workflows](https://docs.saf-demo.online/workflows/docs/workflows/add-workflow.html#checklist).
