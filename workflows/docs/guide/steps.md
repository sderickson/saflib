# Steps

## Core steps

Workflows are basically a checklist, and steps are items on that checklist. The library comes with a handful of core steps which can be composed to execute on a number of engineering routines.

### Copy and Update

The `CopyStepMachine` takes all the [template files](./templates.md) and copies them to the target directory, with some simple string replacement, and skipping files that already exist. Use `UpdateStepMachine` to prompt the agent to make changes to any of those copied files.

* [CopyStepInput](https://docs.saf-demo.online/workflows/docs/ref/interfaces/CopyStepInput.html)
* [UpdateStepInput](https://docs.saf-demo.online/workflows/docs/ref/interfaces/UpdateStepInput.html)

### Prompt

The `PromptStepMachine` prompts the agent to do an arbitrary task.

* [PromptStepInput](https://docs.saf-demo.online/workflows/docs/ref/interfaces/PromptStepInput.html)

### Command

The `CommandStepMachine` runs a shell command as part of a workflow. Stops the workflow if the command fails.

* [CommandStepInput](https://docs.saf-demo.online/workflows/docs/ref/interfaces/CommandStepInput.html)

### CD

The `CdStepMachine` updates the current working directory for subsequent steps, such as "copy", "update", and "command".

* [CdStepInput](https://docs.saf-demo.online/workflows/docs/ref/interfaces/CdStepInput.html)

## Options

When creating a [step](https://docs.saf-demo.online/workflows/docs/ref/functions/step.html), you can provide the following options:

* `validate`: An async function that validates the step after it has been executed. If it returns a string, which is prompted to the agent. The workflow is kept from moving forward until the validate function returns undefined.
* `skipIf`: A synchronous function that determines if the step should be skipped.

Both have access to the workflow context.

## Best practices

### Keep steps medium in size

Steps should neither be too small nor too large. If the step is too small, the agent may try to busy itself and do extraneous work. If it's too large, the agent is not likely to be able to do it all reliably.

As a general rule, use an update step for each file which requires non-trivial changes. Use a prompt step as a catch-all for multiple small code changes, or fold them into an update step prompt.

### Start with the main event

Copy the files first, then update the one that is the central focus. If the agent is given other work, it'll tend to do the central piece as well before you've had a chance to properly prompt it. Rather than trying to resist that impulse, lean into it and have the agent implement the main piece first, then do things like add tests, hook things up, etc. Sorry, test-driven development.

### End with checks

One of the main benefits of this workflow tool is it gets more reliable results. One of the main ways you do this is by running checks at the end of every workflow. Have the agent make sure all the types are correct, all the tests pass, etc, rather than having to run those checks and prompt those fixes yourself. If these are the last steps, then you know that the work that was done ticks the main boxes. Use command steps for this.