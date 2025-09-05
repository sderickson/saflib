# Overview

`@saflib/workflows` provides a framework for defining and running developer workflows in TypeScript projects, particularly with coding tools such as Cursor, Claude Code, or any tool which integrates an LLM with coding tools, and which may run arbitrary commands continuously if allowed.

The purpose of `@saflib/workflows` is to make code generation more reliable for routine work. You can define a series of steps which the agent will follow, with checks along the way to make sure the work is done according to what is correct for your project or stack.

For more information on the why, see [this doc](https://docs.saf-demo.online/workflows.html).

## What's In A Workflow?

To define a workflow, you need the following:

### Steps

The core part of a workflow is a series of steps to take to complete the task. The steps include:

- **Copying** from template files
- **Updating** those files-from-templates based on the current task
- **Running Checks** like running automated tests or static analysis tools
- **Running Scripts** such as installing dependencies or generating code (deterministically)
- **Prompting** the agent or user

### Documents

These documents are the source of truth for what the workflow should generate. The workflow itself should not contain documentation, it should refer to the documentation and focus on directing and orchestrating.

Ideally, these documents should live in the same package or module as the workflow, because docs beget workflows.

### Templates

These represent the preferred way to structure whatever thing is being created or updated as part of the workflow. You're much more likely to have a reliable result if the agent (or developer!) doesn't have to start from scratch.

## Interface

The workflow interface is a command line tool; this works well with agents which can run arbitrary commands so they can automatically continue the workflow. A workflow can also then be "run" by a human to test it, or to understand the process and better review another's work.

To start a workflow, the agent will run a command like this:

```bash
npm exec saf-workflow kickoff <workflow-name> <workflow-arguments>
```

The CLI tool will run through the steps until a step prints out a prompt. Then it will print instructions to continue the workflow and exit. By telling an agent to run a command, they will then automatically go through the steps, doing their own work when prompted.

## Defining a Workflow

A workflow definition looks like this:

```ts
// Arguments specific to this workflow, to be passed to the CLI tool
const input = [
  {
    name: "name",
    description: "Name of the thing being created",
    exampleValue: "example-thing",
  },
] as const;

// Context specific to this workflow, to be used in the steps, derived from input
interface ExampleWorkflowContext {
  name: string;
  targetDir: string;
}

export const ExampleWorkflowMachine = makeWorkflowMachine<
  ExampleWorkflowContext,
  typeof input
>({
  id: "example",

  description: "Create a new thing in your project.",

  input,

  context: ({ input }) => {
    const targetDir = path.join(process.cwd(), "things", input.name);
    return { name: input.name, targetDir };
  },

  templateFiles: {
    thing: path.join(sourceDir, "template-file.ts"),
    test: path.join(sourceDir, "template-file.test.ts"),
  },

  docFiles: {
    overview: path.join(import.meta.dirname, "./README.md"),
  },

  steps: [
    // copy the template files to the target directory
    step(CopyStepMachine, ({ context }) => ({
      name: context.name,
      targetDir: context.targetDir,
    })),

    // prompt the agent to review a doc
    step(DocStepMachine, () => ({
      docId: "overview",
    })),

    // prompt to update the first file
    step(UpdateStepMachine, ({ context }) => ({
      fileId: "thing",
      promptMessage: `Implement **${path.basename(context.copiedFiles!.thing)}**.`,
    })),

    // prompt to update the second file
    step(UpdateStepMachine, ({ context }) => ({
      fileId: "test",
      promptMessage: `Update **${path.basename(context.copiedFiles!.test)}**: test that the thing works.`,
    })),

    // run the test, prompt the agent to fix the test if it fails
    step(TestStepMachine, () => ({
      fileId: "test",
    })),

    // run all tests for the package, prompt the agent to fix any failures
    step(TestStepMachine, () => ({})),
  ],
});

// A runner class specifically for this workflow
export class ExampleWorkflow extends XStateWorkflowRunner {
  machine = ExampleWorkflowMachine;
  description = ExampleWorkflowMachine.definition.description || "";
  cliArguments = input;
  sourceUrl = import.meta.url;
}
```
