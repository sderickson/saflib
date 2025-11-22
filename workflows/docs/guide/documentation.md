# Documentation

## As part of workflows

Documentation can be included as part of the workflow, with their paths injected into prompts.

You can of course simply refer to the document directly within prompts, but enumerating them as part of the workflow allows the tool to error if the path is broken, and can be included as part of workflow documentation.

```ts
export const WorkflowDefinition = defineWorkflow<typeof input, WorkflowContext>({
  // ...

  docFiles: {
    readme: path.join(import.meta.dirname, "../docs/README.md"),
  },

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      targetDir: context.targetDir,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "route",
      promptMessage: `Update **${path.relative(context.targetDir, context.copiedFiles!.route)}**.

      - Return errors created with the `http-error` package.
      - Check the OpenAPI spec for what errors are expected.
      - Also make sure the handler is added to the express router in **${path.relative(context.targetDir, context.copiedFiles!.index)}**.
      
      See **${context.docFiles?.readme}** for more information.`,
    })),

    // ...
  ],
```

## Best practices

### Write them yourself

You can generate documentation, but it's better to produce it the old fashioned way. One of the ways developers can get agents to do better work is to have a strong vision and opinion of what are the right way to do things, and part of figuring out what that is through writing. Agents are good editors and thought partners, but write the first draft.

### Use them as your source of truth

Workflows are prescriptive ways to get the results you want, and documentation is what specifies what those results should be and why. Think of documentation as the written law, workflows as enforcement. If something changes, explain what that change is and why in documentation, then enact those changes through workflows.

### Don't rely on them for reliability

One approach to workflows is rely heavily on documentation to describe what you want, simply telling the agent to read all the docs then build the thing, but then the results won't be as good. Pointed instructions in the prompts, or better yet embedded in the templates, will more likely be followed, with automated checks where they're easy to add or crucial to have.