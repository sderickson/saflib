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

To use these packages in a new project, you can create a project from [the SAF template repo](https://github.com/sderickson/saf-template).

To use these packages in an existing project:

1. Clone [`sderickson/saflib`](https://github.com/sderickson/saflib) into your repository somewhere as a git submodule.
2. Add the directory as a workspace for your root-level `package.json`. For example if you added the submodule at the root directory, you'd add `"saflib/**"` to your [`workspaces` field](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#workspaces).
3. Run `npm install` or equivalent.

To use a given package, install it as a dependency in your own package. The value of the dependency should be `"*"` so that it gets the workspace version.
