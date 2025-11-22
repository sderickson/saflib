# With Version Control

## Committing changes automatically

The workflow tool can produce a great many changes, especially for [complex workflows](./complex-workflows.md) driven by [the CLI tool](./with-an-agent.md#the-workflow-tool-invokes-the-agent); to help manage these changes, the workflow tool can make commits at the end of each workflow where there are changes.

```bash
npm exec saf-workflow kickoff ./path/to/workflow.ts -- -v git
```

The commit message will be the checklist produced by the workflow, and the lines for those will come from the `description` or `checklistDescription` fields in the workflow definition.

## Enforcing the correct files are changed

As part of making sure commits and their descriptions are accurate, the workflow tool will only make commits if the changes are expected. Changes to files made from `templateFiles` are expected, and if others should be allowed, they can be specified in the `versionControl` field, which take [minimatch patterns](https://www.npmjs.com/package/minimatch).

```ts
export const WorkflowDefinition = defineWorkflow<typeof input, WorkflowContext>({
  // ...

  versionControl: {
    allowPaths: ["./dist/**"],
  },

  // ...
});
```

If the workflow tool detects unexpected changes, it will prompt the agent to justify its changes, and either commit or revert them before continuing. In practice, this works well. The agent can decide if the changes were actually necessary, or if they went beyond the scope, and results in "unplanned" work put into separate commits.