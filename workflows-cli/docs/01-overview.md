# Overview

`@saflib/workflows-cli` is the **monorepo workflow registry and CLI** for SAF. It depends on every package that exports workflows, aggregates them in [`list.ts`](../../workflows-cli/list.ts), and exposes the [`saf-workflow`](./cli/saf-workflow.md) command.

The workflow **engine** lives in [`@saflib/workflows`](../workflows/docs/01-overview.md) (`defineWorkflow`, step machines, `runWorkflowCli`). That package cannot own the CLI directly — other packages depend on it to _author_ workflows, so a separate package collects concrete definitions and wires the bin entry.

## Running workflows

From the **target package** directory (must contain `package.json`):

```bash
npm exec saf-workflow list
npm exec saf-workflow list --all --details
npm exec saf-workflow kickoff vue/add-view MyPage
npm exec saf-workflow checklist openapi/add-route
npm exec saf-workflow dry-run sdk/add-query matters list
```

`saf-workflow list` (without `--all`) shows workflows whose `sourceUrl` package matches the cwd — typically workflows **defined in that package**. Use `--all` to see every registered workflow in the monorepo.

Per-workflow usage and checklists: each package's [`docs/workflows/`](../vue/docs/workflows/index.md) (e.g. [vue](../vue/docs/workflows/index.md), [openapi](../openapi/docs/workflows/index.md), [sdk](../sdk/docs/workflows/index.md)).

## Commands

| Command                            | Purpose                                                                |
| ---------------------------------- | ---------------------------------------------------------------------- |
| [`kickoff`](./cli/saf-workflow.md) | Start a workflow by id (`vue/add-view`) or path (`./workflows/foo.ts`) |
| `dry-run`                          | Validate flow and inputs without writes, commands, or prompts          |
| `checklist`                        | Print the step list for a workflow (uses example args)                 |
| `list`                             | Workflows available in the current package (`--all`, `--details`)      |
| `info`                             | Usage line and argument help for a workflow id                         |
| `source`                           | GitHub URL for a workflow's source file                                |
| `status` / `next` / `goto`         | Step through an in-progress workflow session                           |
| `run-scripts`                      | Run script-mode steps for a workflow                                   |

`kickoff` options include `--run cursor` (agent-driven), `--version-control git`, `--skip-todos`, and `--message` for extra agent context. See [execution modes](../workflows/docs/01-overview.md#execution-modes) in the engine docs.

## Registry (`list.ts`)

[`list.ts`](../../workflows-cli/list.ts) imports each package's `workflows/index.ts` default export and spreads them into one array passed to `runWorkflowCli`.

Registered packages (maintained via [workflows/add-workflow](../workflows/docs/workflows/add-workflow.md) `workflow-cli-imports` / `workflow-cli-spreads` areas):

| Package             | Examples                                                                         |
| ------------------- | -------------------------------------------------------------------------------- |
| `@saflib/vue`       | `vue/add-view`, `vue/add-spa`, …                                                 |
| `@saflib/openapi`   | `openapi/add-route`, …                                                           |
| `@saflib/drizzle`   | `drizzle/add-query`, …                                                           |
| `@saflib/express`   | `express/init`, …                                                                |
| `@saflib/sdk`       | `sdk/add-query`, …                                                               |
| `@saflib/product`   | `product/init`                                                                   |
| `@saflib/processes` | `processes/spec-project`                                                         |
| `@saflib/workflows` | `workflows/add-workflow`                                                         |
| …                   | cron, jobs, grpc, env, commander, monorepo, integrations, email, sentry, service |

To add a new workflow package: export definitions from `workflows/index.ts`, then register imports/spreads in `list.ts` (or run `workflows/add-workflow`).

## Bin wiring

[`bin/saf-workflow/index.ts`](../../workflows-cli/bin/saf-workflow/index.ts) calls `runWorkflowCli(workflows, { getSourceUrl, systemPrompt })`:

- **`getSourceUrl`** — maps workflow source files to GitHub URLs under `saflib/`
- **`systemPrompt`** — prepended when `--run cursor`; points agents at [monorepo overview](../monorepo/docs/01-overview.md)

Products outside this monorepo can depend on `@saflib/workflows` and ship their own registry package the same way.
