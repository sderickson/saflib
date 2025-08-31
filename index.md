# Overview

SAF stands for Scott's Application Framework. I've built it to:

1. Build my own production-ready web apps
2. Experiment with LLM-assisted development
3. Share what I learn

Guiding principles:

- **Self-Contained**. A new app should run with little setup or dependencies on outside services.
- **Feature Complete**. Includes expected modern web app features such as CI/CD, message queues, and i18n.
- **Batteries Included**. Optional features and services are included, such as an identity service or secret storage.
- **Easy to Update**. When the framework introduces breaking changes, updates can happen mostly automatically.
- **Built for AI**. Technical decisions and interfaces are always made with AI coding agents in mind.

One thing this framework is _not_ is something meant to be adopted directly for anything mission-critical. It's a proof of concept; given how broad it is I simply don't have the time nor the resources to bring everything up to a sufficient quality bar and maintain that bar for general use. This is why none of the packages are published. At most I recommend using this framework with a prototype or hobby project, where it's okay if updating to the latest version requires some manual fixing.

The one exception to this is [`@saflib/workflows`](./workflows/docs/overview.md). If there's a package that I do want to refine and make available for general use, it's that one. Once the interface and feature set are stable enough, it will be published.

## Documentation

The focus of the docs on [this site](https://docs.saf-demo.online/) are what's in [`saflib`](https://github.com/sderickson/saflib), which contains all the shared code across all SAF-based projects. It is a broad collection of packages, spanning common dependencies and reusable features.

These docs are also accessible when coding with SAF by searching for their markdown files. Include them as context in prompts, and update them as part of normal work.

## Setup

_**Warning**: The repos linked to below need to be updated._

To use these packages in a new project, you can create a project from [the SAF template repo](https://github.com/sderickson/saf-template). You can also use the [SAF website repo](https://github.com/sderickson/saf-2025) as reference. The latter is what builds and serves this documentation using [VitePress](https://vitepress.dev/).

To use these packages in an existing project:

1. Clone [`sderickson/saflib`](https://github.com/sderickson/saflib) into your repository somewhere as a git submodule.
2. Add the directory as a workspace for your root-level `package.json`. For example if you added the submodule at the root directory, you'd add `"saflib/**"` to your [`workspaces` field](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#workspaces).
3. Run `npm install` or equivalent.

To use a given package, install it as a dependency in your own package. The value of the dependency should be `"*"` so that it gets the workspace version.
