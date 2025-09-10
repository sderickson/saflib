# saf-workflow

```
Usage: saf-workflow [options] [command]

Tool for agents to be given a series of prompts. For a list of available
   workflows, run:

npm exec saf-workflow help kickoff

Options:
  -h, --help                    display help for command

Commands:
  kickoff <path> [args...]      Kick off a workflow from a file path. That path should export a definition as
     its default export.
  status                        Show the status of the current workflow.
  next                          Try to go to the next step of the current
                                workflow.
  checklist <workflowIdOrPath>  Show the checklist for a workflow. Can be called with a workflow ID or a file
     path to a workflow definition.
  list                          List all available workflows for the current
                                package.
  source                        Print the GitHub url for a workflow.
  help [command]                display help for command

```
