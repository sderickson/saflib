# saf-workflow kickoff

```
Usage: saf-workflow kickoff [options] <path-or-id> [args...]

Kick off a workflow. Takes a workflow name and then any arguments for the
   workflow. Names should be kebab-case, and paths should be
   ./relative/to/package/root.ts. All commands should be run in a folder with a
   package.json; the package the workflow is acting on. Example:

npm exec saf-workflow kickoff add-tests ./path/to/file.ts

Arguments:
  path-or-id                    Path to the workflow file, or the workflow ID
  args                          Arguments for the workflow

Options:
  -m, --message <message>       Message to add to the workflow
  -r, --run <mode>              Directly command an agent instead of printing
                                prompts. Currently only "cursor" and "mock" are
                                supported.
  -v, --version-control <mode>  Manage version control for the workflow.
                                Currently only "git" is supported.
  -s, --skip-todos              Skip TODOs in the workflow. This is useful if
                                you want to run the workflow without having to
                                complete TODOs.
  -h, --help                    display help for command
```
