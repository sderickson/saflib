# Templates

## Adding Templates

Most workflows will first copy over templates, to create a scaffold for the agent to work from.

To add, copy, and update a template, set up your workflow like this:

```ts
export const WorkflowDefinition = defineWorkflow<typeof input, WorkflowContext>({
  // ...

  // Targets may be directories or files. The keys can be referenced
  // in the workflow so include files you want to directly reference
  // in prompts.
  templateFiles: {
    route: path.join(sourceDir, "./routes/__group-name__/__target-name__.ts"),
    test: path.join(sourceDir, "./routes/__group-name__/__target-name__.test.ts"),
    index: path.join(sourceDir, "./routes/__group-name__/index.ts"),
  },

  steps: [
    // `targetDir` is provided in the context function in this workflow.
    // All other context values (`cwd`, `copiedFiles`, etc.) are provided
    // by the workflows tool.
    step(CopyStepMachine, ({ context }) => ({
      targetDir: context.targetDir,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      // `fileId` is the key of the template file to update.
      fileId: "route",
      promptMessage: `Update **${path.relative(context.targetDir, context.copiedFiles!.route)}**.

      - Return errors created with the `http-error` package.
      - Check the OpenAPI spec for what errors are expected.
      - Also make sure the handler is added to the express router in **${path.relative(context.targetDir, context.copiedFiles!.index)}**.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "test",
      promptMessage: `Update **${path.relative(context.targetDir, context.copiedFiles!.test)}**.

      - Mock any external dependencies.
      - Test both success and error scenarios.`,
    })),

    // ...
  ],
});
```

## String Interpolation

To streamline the process, template files can contain placeholders which will automatically be replaced in the copy step. The copy step can take a [`lineReplace`](https://docs.saf-demo.online/workflows/docs/ref/interfaces/CopyStepInput.html#linereplace) function to perform string transformations on the template files and paths.

The `saflib/workflows` library provides one function, [`makeLineReplace`](https://docs.saf-demo.online/workflows/docs/ref/functions/makeLineReplace.html), which will replace strings wrapped in double underscores with the given context. It assumes the context will have key values in `camelCase` with values in `kebab-case`. Then it will look for all string variations of the key, such as `kebab-case`, `snake_case`, `PascalCase`, `camelCase`, and `SNAKE_CASE`, and replace them with the value with the appropriate casing and connecting characters. It also replaces instances of `template-package` with the value of the `sharedPackagePrefix` context key, if it exists, which is a special case because npm package names cannot start with an underscore, and template package.json files should still be valid packages.

The library also comes with helper functions to assist in templating:
- `getPackageName` - reads the package.json for the given cwd and returns the package name.
- `parsePackageName` - takes a package name and returns a breakdown into conventional parts for templating. It assumes the package name is the service name followed by the kind of package it is, such as `-http`, `-db`, `-common`, etc. The package name `@saflib/product-http` provides:
  - `organizationName` - the organization name: `@saflib`.
  - `packageName` - the full package name: `@saflib/product-http`.
  - `serviceName` - the service name: `product`.
  - `sharedPackagePrefix` - the shared package prefix: `@saflib/product`.
- `parsePath` - takes a target path to a file and breaks it down into conventional parts for templating, such as `./routes/gizmos/list.ts`. Provides:
  - `groupName` - the group name: `gizmos`.
  - `targetName` - the target name: `list`.

Put all together, a workflow (in this case to add an http route) that uses the provided helpers will look like this:

```ts
interface WorkflowContext
  extends ParsePathOutput,
    ParsePackageNameOutput {}

export const WorkflowDefinition = defineWorkflow<typeof input, WorkflowContext>({
  // ...

  context: ({ input }) => {
    return {
      ...parsePath(input.path, {
        requiredPrefix: "./routes/",
        requiredSuffix: ".ts",
        cwd: input.cwd,
      }),
      ...parsePackageName(getPackageName(input.cwd), {
        requiredSuffix: "-http",
      }),
    };
  },
  
  // ...

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    // ...

  ],
});
```

See a full example template file [here](https://github.com/sderickson/saflib/blob/main/express/workflows/templates/routes/__group-name__/__target-name__.ts).

## Adding TODOs

Usually agents will do what they're prompted to do, but not always; for this reason the `update` step will not allow the workflow to move forward until all instances of "todo" comments are removed from the file. Sprinkle these throughout your template with specific instructions to the agent, to both guide them and add a small but effective check that they get done. 

## Best practices

### Keep files (and by extension, their templates) small

Have one file for every "thing" in your codebase. One file per route, query, event, db table, component, etc. This will:

* Help the agent go faster
* Make it easier to tell them what to do (just a file, not also a line number)
* Make it apparent what the agent has done (based on which files have changed)

See [SAF best practices](https://docs.saf-demo.online/best-practices.html#keep-files-small) for more details.

### Templates should work as-is

The reason the provided templating function uses underscores is these are valid variables in TypeScript; this way the template can actually compile and run. If you run the template tests, they should pass, and if you check types, they should be correct.

This also helps when your platform changes. If you change function signatures or deprecate functions, the template should be updated to reflect the latest and best way to do things, and being a part of your linting and typechecking processes helps keep your templates up-to-date.

To make sure template breakages are fixed, template files should also be part of CI checks. If a template test fails or its types are not correct, they should be fixed before changes are merged.

### Include instructions

The closer the prompt is to the time and location of the change, the better. It's *least* likely an agent will follow instructions in a giant corpus of documentation it is fed every time, it is *more* likely to follow instructions if they are part of the prompt, and they are *most* likely to follow instructions if they are right where they need to happen. Don't be shy about including a `TODO` comment in every part of the template where the agent needs to do something.

### Share templates

An area of the codebase is likely to have multiple workflows to act on it; those workflows should all draw from the same directory of template files.

For example, if you have a database directory, with schemas and query functions, your template folder for database workflows should have those schema and query files together in the same structure that they will be copied into. This way your templates are not only representing the contents of the files you want, they also reflect the folder structure you want. This also helps with making templates work as-is, when they can reference one another.

For a real use case, see [SAF's openapi templates files](https://github.com/sderickson/saflib/tree/main/openapi/workflows/templates), which have files laid out and used by four different workflows: `init`, `add-schema`, `add-route`, and `add-event`.
