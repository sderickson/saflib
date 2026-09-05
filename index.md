# Overview

SAF stands for Scott's Application Framework. I've built it to:

1. Build my own production-ready web apps
2. Experiment with LLM-assisted development
3. Share and collaborate on what I learn

Guiding principles:

- **Self-Contained**. A new app should run with little setup or dependencies on outside services.
- **Feature Complete**. Includes expected modern web app features such as CI/CD, background jobs, and i18n.
- **Batteries Included**. Optional but common features and services are included, such as secret and blob storage.
- **Easy to Update**. When the framework introduces breaking changes, updates can happen mostly automatically.
- **Built for AI**. Technical feature development decisions are always made with AI coding agents in mind.

## Adoption Concerns

In my professional opinion, this framework's quality bar meets and exceeds the needs for production-grade apps which house sensitive information and risky capabilities. That being said, if anyone adopts this they should assess the framework themselves and either fork it and make desired adustments and ideally submit PRs for them.

The framework is also fairly flexible and the concepts portable to your needs and preferences. If out of the box you'd rather use PostgreSQL instead of SQLite, Drizzle supports both and more. If you'd rather use React instead of Vue, the frontend organizational structure can mostly be kept. Also, common services such as for observability accept adapters for whichever in-house or third-party services you prefer.

## Documentation

The focus of the docs on [this site](https://docs.saf-demo.online/) are what's in [`saflib`](https://github.com/sderickson/saflib), which contains all the shared code across all SAF-based projects. It is a broad collection of packages, spanning common dependencies and reusable features.

These docs are also accessible when coding with SAF by searching for their markdown files. Include them as context in prompts, and update them as part of normal work.

## Setup

### New project

From a **git repository** (run `git init` first if needed). Requires **Node.js 26+**. saflib is an npm workspace monorepo, so install the bootstrap script with `curl` (not `npx` subpaths):

```bash
curl -fsSL https://raw.githubusercontent.com/sderickson/saflib/main/product/create/saf-create.sh -o /tmp/saf-create.sh
chmod +x /tmp/saf-create.sh
/tmp/saf-create.sh <name> <domain> --saflib-ref main
```

Example on a feature branch:

```bash
git init my-app && cd my-app
REF=2026-09-02-doc-updates
curl -fsSL "https://raw.githubusercontent.com/sderickson/saflib/${REF}/product/create/saf-create.sh" -o /tmp/saf-create.sh
chmod +x /tmp/saf-create.sh
/tmp/saf-create.sh fiddlysticks fiddlysticks.com --saflib-ref "${REF}"
```

While developing saflib locally:

```bash
./saflib/product/create/run.ts my-app example.com --saflib-ref HEAD
```

This adds [`saflib`](https://github.com/sderickson/saflib) as a submodule, creates the root workspace `package.json`, and runs [`product/init`](./product/docs/workflows/init.md).

Options include `--org <scope>`, `--saflib-ref <branch-or-tag>`, and `--force`. See [`saf-create`](./product/docs/workflows/create.md).

If the repository **already has a saflib submodule**, use `product/init` instead:

```bash
npm exec saf-workflow kickoff product/init <name> <domain>
```

### Existing project

To add SAF to a repository that does not use `saf-create`:

1. Clone [`sderickson/saflib`](https://github.com/sderickson/saflib) into your repository somewhere as a git submodule.
2. Add the directory as a workspace for your root-level `package.json`. For example if you added the submodule at the root directory, you'd add `"saflib/**"` to your [`workspaces` field](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#workspaces).
3. Run `npm install` or equivalent.
4. Run `npm exec saf-workflow kickoff product/init <name> <domain>` from the monorepo root.

To use a given package, install it as a dependency in your own package. The value of the dependency should be `"*"` so that it gets the workspace version.
