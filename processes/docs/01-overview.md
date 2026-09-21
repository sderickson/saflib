# Overview

`@saflib/processes` provides **agent-oriented workflows and templates** for planning and implementing SAF features. It is not imported by product runtime code; it exists so coding agents (and humans) can kick off repeatable spec → plan → implementation flows using SAF workflows.

## Starting a project: `processes/spec-project`

From the `plans/` directory, run:

```bash
npm exec saf-workflow kickoff processes/spec-project <kebab-name>
```

This guides in creating a spec, a plan, and then a workflow or workflows to execute the plan according to the spec. You can tell an agent to run this so they do the writing and ask questions.

### Security model updates

Every spec includes a **Security Model Updates** section. When filling it in, the agent reads the product's `security/threat-model.md` (see [`base/security/threat-model.md`](../../base/security/threat-model.md) for the starter version) and records how the feature changes the product's public surface, authorization rules, data handling, integrations and secrets, file handling, and security tests. If nothing changes, the section says "None" with a one-line reason; it is never deleted.

After the user confirms the spec, the workflow applies those updates to the threat model itself, before planning begins. The plan is then expected to include the implied work (authz tags, mock clients, security specs) rather than leaving it for later. The point is to make checking the threat model a habit that happens on every project, not a separate exercise that's easy to skip.

This process is still experimental. It's under active development and is likely to undergo major changes in the latter part of 2026.
