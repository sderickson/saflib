# Overview

`@saflib/processes` provides **agent-oriented workflows and templates** for planning and implementing SAF features. It is not imported by product runtime code; it exists so coding agents (and humans) can kick off repeatable spec → plan → implementation flows using SAF workflows.

## Starting a project: `processes/spec-project`

From the `plans/` directory, run:

```bash
npm exec saf-workflow kickoff processes/spec-project <kebab-name>
```

This guides in creating a spec, a plan, and then a workflow or workflows to execute the plan according to the spec. You can tell an agent to run this so they do the writing and ask questions.

This process is still experimental. It's under active development and is likely to undergo major changes in the latter part of 2026.