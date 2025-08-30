# Implementation Checklist: TEMPLATE_FILE

The agent should find the first unchecked workflow, run it, and check it off. Each workflow should be run in the context of the TEMPLATE_FILE project.

To run a workflow with the workflow tool:

- `cd` to the Path to Run In
- run `npm exec saf-workflow kickoff <Workflow Command>`

Then do everything it tells you to.

| Step | Workflow Command | Path to Run In | Status |
| ---- | ---------------- | -------------- | ------ |
| 1    | example-workflow | path/to/run/in | [ ]    |
| 2    | another-example  | another/path   | [ ]    |
