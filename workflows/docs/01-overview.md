# Overview

`@saflib/workflows` is the **workflow engine** for SAF — TypeScript-defined, agent-supervised routines that copy templates, run commands, prompt for edits, and validate results. Platform and product packages export workflow definitions; [`saf-workflow`](../../workflows-cli/docs/cli/saf-workflow.md) (`@saflib/workflows-cli`) registers and runs them.

Workflows use [XState](https://stately.ai/docs) internally; authors use the higher-level `defineWorkflow` / step-machine API rather than raw machines. See [@saflib/xstate](../xstate/docs/01-overview.md) for notes on backend product processes vs developer workflows.

Extended narrative and examples also live on [workflows.saf-demo.online](https://workflows.saf-demo.online/).

## What this package provides

| Export                                                                                                  | Role                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`defineWorkflow`](./ref/functions/defineWorkflow.md) / [`step`](./ref/functions/step.md)               | Declare a workflow (`id`, `input`, `context`, `steps`, …)                                                                                                                                                                                                                                                                                                                                                                                           |
| [`makeWorkflowMachine`](./ref/functions/makeWorkflowMachine.md)                                         | Nest one workflow inside another as a step                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Step machines**                                                                                       | [`CopyStepMachine`](./ref/variables/CopyStepMachine.md), [`UpdateStepMachine`](./ref/variables/UpdateStepMachine.md), [`PromptStepMachine`](./ref/variables/PromptStepMachine.md), [`CommandStepMachine`](./ref/variables/CommandStepMachine.md), [`CdStepMachine`](./ref/variables/CdStepMachine.md), [`NpmScriptStepMachine`](./ref/variables/NpmScriptStepMachine.md), [`TransformFileStepMachine`](./ref/variables/TransformFileStepMachine.md) |
| **Helpers**                                                                                             | [`makeLineReplace`](./ref/functions/makeLineReplace.md), [`parsePath`](./ref/functions/parsePath.md), [`parsePackageName`](./ref/functions/parsePackageName.md), offshoot init helpers                                                                                                                                                                                                                                                              |
| [`runWorkflow`](./ref/functions/runWorkflow.md) / [`runWorkflowCli`](./ref/functions/runWorkflowCli.md) | Execute or expose workflows programmatically                                                                                                                                                                                                                                                                                                                                                                                                        |

Package exports: `@saflib/workflows` (engine) and `@saflib/workflows/workflows` (meta workflows including [workflows/add-workflow](./workflows/add-workflow.md)).

## Running workflows

From a package directory (must contain `package.json`):

```bash
npm exec saf-workflow list              # workflows available here
npm exec saf-workflow kickoff <id> …    # start a workflow
npm exec saf-workflow checklist <id>    # preview steps
npm exec saf-workflow dry-run …         # alias for dry/script validation
```

Common ids look like `vue/add-view`, `openapi/add-route`, `product/init`, `processes/spec-project`. See per-package [`docs/workflows/`](../vue/docs/workflows/index.md) indexes (e.g. [vue](../vue/docs/workflows/index.md), [openapi](../openapi/docs/workflows/index.md), [sdk](../sdk/docs/workflows/index.md)).

### Execution modes

| Mode        | Purpose                                                                     |
| ----------- | --------------------------------------------------------------------------- |
| `checklist` | Generate a generic step list (uses example args; no cwd side effects)       |
| `dry`       | Validate inputs and flow without writes, commands, or prompts               |
| `script`    | Run mechanical steps only — copies, commands; skips prompts and TODO checks |
| `print`     | Emit prompts and logs; halt at prompts for an external agent                |
| `run`       | Tool drives the agent (e.g. Cursor CLI) through each step                   |

Use `script` or `dry` to verify wiring before `print`/`run`. [`UpdateStepMachine`](./ref/variables/UpdateStepMachine.md) blocks progress while copied files still contain `TODO` markers (skippable with `--skip-todos`).

## Authoring a workflow

1. Add `workflows/<name>.ts` in your package with `defineWorkflow({ id: "package/<name>", … })`.
2. Export it from `workflows/index.ts` (default export array + named exports).
3. Register the package in [`workflows-cli/list.ts`](../../workflows-cli/list.ts) inside the `workflow-cli-imports` / `workflow-cli-spreads` areas — or run [workflows/add-workflow](./workflows/add-workflow.md) to scaffold steps 1–3.

Typical step sequence:

1. **`CopyStepMachine`** — scaffold from `@saflib/templates` with `makeLineReplace(context)`.
2. **`UpdateStepMachine`** — agent fills generated files (links `docFiles` for context).
3. **`PromptStepMachine`** — freeform user/agent checkpoint.
4. **`CommandStepMachine`** / **`NpmScriptStepMachine`** — `typecheck`, `test`, codegen.
5. **`CdStepMachine`** — change cwd before steps that target another package.

Set `versionControl.allowPaths` so git commits stay scoped. Nested work uses `makeWorkflowMachine(OtherWorkflowDefinition)`.

## Where workflows live

| Area                | Examples                                                                                                                                                              |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Platform            | [vue/add-view](../vue/docs/workflows/add-view.md), [openapi/add-route](../openapi/docs/workflows/add-route.md), [workflows/add-workflow](./workflows/add-workflow.md) |
| Product scaffolding | [product/init](../product/docs/workflows/init.md)                                                                                                                     |
| Agent planning      | [processes/spec-project](../processes/docs/workflows/spec-project.md)                                                                                                 |

Workflow definitions are normal TypeScript — test with `runWorkflow(def, { mode: "checklist", … })` in package tests.

## Regenerating docs

From this package:

```bash
npm exec saf-docs generate
```

Refreshes [`docs/ref/`](./ref/index.md) and [`docs/workflows/`](./workflows/index.md).
