# Overview

SAF stands for Scott's Application Framework. I've built it to:

1. Build my own production-ready web apps
2. Experiment with LLM-assisted development
3. Share what I learn

Guiding principles:

- **Self-Contained**. A new app should run with little setup or dependencies on outside services except essentials, such as dependable, trusted email services.
- **Feature Complete**. The framework provides the sorts of features you'd expect to have for modern web apps such as CI/CD pipeline, common backend services like background tasks or message queues, and code health reports.
- **Batteries Included**. Optional features, services, and utilities are included. These might be simple libraries like common Express middleware configuration, or entire E2E services like sign-up/sign-in flows and an identity service.
- **Easy to Update**. It should be seamless to build a new tool in this repo as part of one product and then adopt it with other applications that use this framework. It should also be easy to update to new versions of this framework. This depends on the application having thorough and well-balanced testing.
- **Built for AI**. This is my playground to experiment with and share methodologies and tools. Technical decisions and workflows are always made with AI coding agents in mind.

## Documentation

The focus of the docs on this site are what's in `saflib`, which contains all the shared code across all SAF-based projects. It is a broad collection of packages, spanning common dependencies and reusable features. It also has documentation and workflows for both human and agent consumption.

[This site](https://docs.saf-demo.online/) provides a quick way to review the docs, but these docs are also accessible when coding with SAF by searching for their markdown files. Include them as context in prompts, and update them as part of normal work.

## Setup

To use these packages in a new project, you can create a project from [the official SAF template repo](https://github.com/sderickson/saf-template). You can also use the [SAF website repo](https://github.com/sderickson/saf-2025) as reference. The latter is what builds and serves this documentation using [VitePress](https://vitepress.dev/).

To use these packages in an existing project:

1. Clone [`sderickson/saflib`](https://github.com/sderickson/saflib) into your repository somewhere as a git submodule.
2. Add the directory as a workspace for your root-level `package.json`. For example if you added the submodule at the root directory, you'd add `"saflib/**"` to your [`workspaces` field](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#workspaces).
3. Run `npm install` or equivalent.

To use a given package, install it as a dependency in your own package. The value of the dependency should be `"*"` so that it gets the workspace version. At time of writing, none of these packages are published to npm yet.
