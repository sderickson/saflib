# Complex Workflows

## Workflows as Steps

Steps and workflows are, under the hood, just state machines. You can use workflows as steps in other workflows, to make larger automated changes. You can also provide custom prompts which will prepended to the first step with a prompt in the invoked workflow.

```ts
export const ImplementCsvUploadDbWorkflowDefinition = defineWorkflow<
  typeof [],
  ImplementCsvUploadDbContext
>({
  // ...

  steps: [
    step(makeWorkflowMachine(UpdateSchemaWorkflowDefinition), () => ({
      path: "./schemas/part-source.ts",
      prompt: `Create a new part_source table schema with the following requirements:
      
      - id: TEXT PRIMARY KEY (random UUID)
      - mimetype: TEXT NOT NULL (MIME type, should be 'text/csv')
      - size: INTEGER NOT NULL (file size in bytes)
      ...
      `,
    })),

    step(makeWorkflowMachine(AddDrizzleQueryWorkflowDefinition), () => ({
      path: "./queries/part-source/get-by-id.ts",
    })),

    // ...
  ],
});
```

## Use Cases

### Custom "Steps"

If you have a step such as a command you use all the time, you can wrap it in a one-step workflow and invoke that. Or if you have a few such commands that you often use together, you can wrap them in a single workflow and invoke that. Commands that run unit tests, coverage checks, or typechecking are good candidates for this.

### Project Plans

Complex workflows are, ironically, easier to generate than [routine ones](./index.md#routine-workflows). If you have a PRD or spec for a project, and a list of routine workflows you've developed, you can instruct an agent to write a one-off workflow composed of those routine workflows.

### Iterative Changes

If you have a larger but repetitive project, such as a migration, you can write a complex workflow which takes an input for one piece of the migration and runs the steps for just that one piece. To completely automate the process, create one more workflow which has a step for each iteration.

### Complex Initializations

A common workflow is to initialize some common structure, such as a new database or SPA, and you can compose these for initializing larger structures. For example, SAF organizes services into a series of similarly-named packages such as a database, HTTP server, API spec, SDK, and shared library. See [the service/init source](https://github.com/sderickson/saflib/blob/bfacd2d57f19dae3bffc286c3691f04f26aa5336/service/workflows/init.ts#L95) for more details.
