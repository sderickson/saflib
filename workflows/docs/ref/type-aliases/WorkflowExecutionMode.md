[**@saflib/workflows**](../index.md)

---

# Type Alias: WorkflowExecutionMode

> **WorkflowExecutionMode** = `"dry"` \| `"script"` \| `"print"` \| `"run"` \| `"checklist"`

The mode to run the workflow in.

## Dry

Runs the workflow as much as possible without making any file changes, running any commands, or prompting. Also tests the workflow inputs and starting cwd.

## Script

Skip prompts and TODO checks, just run commands and copy template files. Useful for debugging those, it's recommended you run this at least once before running in "print" or "run" modes, to make sure the agent doesn't get tripped up by the automations the workflow itself performs.

## Print

Print out logs and prompts, halt the machine at prompts. The original execution mode which integrates well with any agent, but lacks guarantees.

## Run

Invert control from "print": the tool invokes the agent. If the workflow tool exits successfully, the workflow has been completed successfully.

## Checklist

Similar to "dry", but uses the example values for inputs and does not do anything that depends on cwd, basically just runs the workflow to generate a generic checklist.
