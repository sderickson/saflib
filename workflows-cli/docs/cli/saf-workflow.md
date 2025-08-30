# saf-workflow

```
Usage: saf-workflow [options] [command]

Tool for agents to be given a series of prompts. For a list of available
   workflows, run:

npm exec saf-workflow help kickoff

Options:
  -h, --help      display help for command

Commands:
  kickoff         Kick off a workflow. Takes a workflow name and then any arguments for the
     workflow. Names should be kebab-case, and paths should be
     ./relative/to/package/root.ts. All commands should be run in a folder with a
     package.json; the package the workflow is acting on. Example:

  npm exec saf-workflow kickoff add-tests ./path/to/file.ts
  status          Show the status of the current workflow.
  next            Try to go to the next step of the current workflow.
  checklist       Show the checklist for a workflow.
  list            List all available workflows for the current package.
  source          Print the GitHub url for a workflow.
  help [command]  display help for command

```
