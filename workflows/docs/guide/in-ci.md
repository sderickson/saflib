# In CI

## Unit tests

The easiest way to automatically test your workflows is to run them in dry mode.

```ts
describe("commander/add-cli", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: AddCLIWorkflowDefinition,
      runMode: "dry",
    });
    expect(result.output?.checklist).toBeDefined();
  });
});
```

## Dedicated CI

For a more thorough test, you can automate running the workflow in script mode in a dedicated CI job. Since the workflow will likely have side-effects, running in script mode in jest is not recommended.

For some examples of dedicated CI jobs, see the [saflib GitHub Actions](https://github.com/sderickson/saflib/tree/main/.github/workflows), especially those that start with "workflow-".

## In Evals

So far, workflows haven't required evals to improve the quality, but they are designed with evals in mind. Once [monitoring and iterating](./monitoring-and-iterating.md) stops consistently improving the reliability of workflows, adding evals and first-class support for evals will be the next step.
